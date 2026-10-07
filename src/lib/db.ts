import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Base de datos ligera de la plataforma: un archivo JSON en un volumen del NAS.
 * Sin dependencias nativas (evita problemas de compilación en ARM). Un solo
 * proceso escribe, así que es seguro; las escrituras son atómicas (temp+rename)
 * y serializadas con una cola.
 */

export interface Project {
  id: string;
  nombre: string;
  ubicacion: string;
  inicio: string;
  entrega: string;
  avance: number;
  estado: "activo" | "finalizado" | "futuro";
  desc: string;
  createdAt: number;
}

/** Cualidad evaluada de un empleado, con nivel 1–5 (solo visible para admins). */
export interface EmployeeQuality {
  nombre: string;
  nivel: number;
}

export interface Employee {
  id: string;
  /** Usuario del NAS (coincide con su login). */
  username: string;
  nombre: string;
  email: string;
  telefono?: string;
  rol: string;
  ranking: number;
  habilidades: string[];
  /** Evaluación por cualidades (admin-only). */
  cualidades?: EmployeeQuality[];
  /**
   * Subcarpetas de "Archivos Compartidos" visibles para este empleado.
   * undefined = ve todas; array = ve solo esas (capa de visualización del app).
   */
  carpetasVisibles?: string[];
  proyectoId: string | null;
  createdAt: number;
}

/**
 * Nivel de permiso de un usuario sobre una carpeta compartida (estilo Windows):
 * - total: ver, escribir y gestionar permisos de la carpeta.
 * - escritura: ver, descargar, subir y modificar.
 * - lectura: solo ver y descargar.
 * - none: sin acceso (la carpeta queda oculta para esa persona).
 */
export type FolderPermLevel = "total" | "escritura" | "lectura" | "none";

/**
 * Compartición de una carpeta dentro de "Archivos compartidos".
 * Por defecto las carpetas son visibles para todos; se crea un registro solo
 * cuando alguien la RESTRINGE (o al crearla, para saber el dueño).
 */
export interface FolderShare {
  /** Ruta WebDAV de la carpeta (dentro de SHARED_ROOT). */
  path: string;
  /** Usuario que la creó/comparte (dueño, siempre con acceso total). */
  sharedBy: string;
  /**
   * Modelo antiguo (compat): null = visible para todos; array = solo esos.
   * Si `perms` está definido, manda `perms` y este campo se ignora.
   */
  allowed: string[] | null;
  /** Nivel por usuario (username en minúsculas). Modelo nuevo estilo Windows. */
  perms?: Record<string, FolderPermLevel>;
  /** Nivel para "Todos los demás" (quienes no estén en `perms`). */
  defaultPerm?: FolderPermLevel;
  createdAt: number;
  updatedAt: number;
}

/** Proveedor de la empresa. */
export interface Supplier {
  id: string;
  nombre: string;
  contacto: string;
  telefono: string;
  email: string;
  categoria: string;
  direccion: string;
  nota: string;
  createdAt: number;
}

export interface Message {
  id: string;
  fromUsername: string;
  fromNombre: string;
  toUsername: string;
  toEmail: string;
  asunto: string;
  cuerpo: string;
  emailEnviado: boolean;
  leido: boolean;
  createdAt: number;
}

export interface MaterialRequest {
  id: string;
  empleadoUsername: string;
  proyectoId: string | null;
  item: string;
  cantidad: string;
  nota: string;
  estado: "pendiente" | "aprobado" | "rechazado";
  createdAt: number;
}

export interface Attendance {
  id: string;
  empleadoUsername: string;
  fecha: string; // YYYY-MM-DD
  hora: string;
  tipo: "entrada" | "salida";
  createdAt: number;
}

export interface InventoryItem {
  id: string;
  nombre: string;
  categoria: string;
  cantidad: number;
  unidad: string;
  ubicacion: string;
  nota: string;
  createdAt: number;
}

/** Evento del historial de un archivo compartido. */
export interface SharedFileEvent {
  usuario: string;
  accion: "subido" | "modificado" | "eliminado";
  fecha: number;
}

/**
 * Metadatos y auditoría de un archivo en "Archivos Compartidos". El NAS no
 * guarda quién subió ni el historial, así que lo registramos aquí cada vez que
 * algo pasa a través de la plataforma.
 */
export interface SharedFileMeta {
  /** Ruta WebDAV completa (p. ej. "Archivos Compartidos/Archivos/plano.pdf"). */
  path: string;
  nombre: string;
  /** Autor original: quién lo subió por primera vez. */
  subidoPor: string;
  /** Fecha de subida (primer registro). */
  subidoEn: number;
  /** Fecha del último evento registrado en la plataforma. */
  ultimaAccion: number;
  historial: SharedFileEvent[];
}

/**
 * Control de acceso a la plataforma. La cuenta de login vive en el NAS; esto
 * decide quién puede USAR la plataforma. Al entrar por primera vez un usuario
 * del NAS que no sea admin ni empleado existente queda "pendiente" hasta que un
 * administrador lo apruebe o rechace.
 */
export interface AccessEntry {
  username: string;
  nombre?: string;
  estado: "pendiente" | "aprobado" | "rechazado";
  solicitadoEn: number;
  decididoEn?: number;
  decididoPor?: string;
}

/**
 * Elemento en la papelera de reciclaje. Al "eliminar", el archivo o carpeta se
 * mueve a una carpeta de papelera en el NAS (no se borra de inmediato); aquí se
 * guarda de dónde salió para poder restaurarlo. Solo un admin vacía la papelera.
 */
export interface TrashEntry {
  id: string;
  /** Nombre original del archivo/carpeta. */
  nombre: string;
  /** Ruta original (para restaurar). */
  originalPath: string;
  /** Ruta actual dentro de la carpeta de papelera. */
  trashPath: string;
  isDir: boolean;
  /** Usuario que lo envió a la papelera. */
  deletedBy: string;
  deletedAt: number;
}

/** Consulta enviada desde el formulario público de contacto (sin sesión). */
export interface Inquiry {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  mensaje: string;
  emailEnviado: boolean;
  leido: boolean;
  createdAt: number;
}

/** Evento del calendario de empresa (compartido por todo el equipo). */
export interface CalendarEvent {
  id: string;
  titulo: string;
  descripcion: string;
  lugar: string;
  /** Instantes absolutos (epoch ms). */
  inicio: number;
  fin: number;
  /** Evento de todo el día (sin hora). */
  allDay: boolean;
  /** Color/categoría (hex). */
  color: string;
  /** Minutos antes del evento para el recordatorio por correo; null = sin recordatorio. */
  recordatorioMin: number | null;
  /** Ya se envió el recordatorio por correo (para no repetirlo). */
  recordatorioEnviado: boolean;
  creadoPor: string;
  creadoEn: number;
}

export interface DBShape {
  projects: Project[];
  employees: Employee[];
  materials: MaterialRequest[];
  attendance: Attendance[];
  messages: Message[];
  inventory: InventoryItem[];
  inquiries: Inquiry[];
  sharedFiles: SharedFileMeta[];
  suppliers: Supplier[];
  folderShares: FolderShare[];
  access: AccessEntry[];
  trash: TrashEntry[];
  events: CalendarEvent[];
  seededEmployees?: boolean;
}

const EMPTY: DBShape = {
  projects: [],
  employees: [],
  materials: [],
  attendance: [],
  messages: [],
  inventory: [],
  inquiries: [],
  sharedFiles: [],
  suppliers: [],
  folderShares: [],
  access: [],
  trash: [],
  events: [],
};

function dbPath(): string {
  return process.env.DATABASE_PATH || "/data/cobalto.json";
}

let writeChain: Promise<void> = Promise.resolve();

/** Lee siempre del disco (evita cachés inconsistentes entre contextos de Next). */
async function load(): Promise<DBShape> {
  try {
    const raw = await fs.readFile(dbPath(), "utf8");
    return { ...EMPTY, ...JSON.parse(raw) };
  } catch {
    return structuredClone(EMPTY);
  }
}

async function persist(data: DBShape): Promise<void> {
  const p = dbPath();
  await fs.mkdir(path.dirname(p), { recursive: true });
  const tmp = `${p}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tmp, p);
}

/** Lee la base de datos (fresca desde disco). */
export async function getDB(): Promise<DBShape> {
  return load();
}

/**
 * Modifica la base de datos de forma segura y atómica: lee fresco, aplica el
 * cambio y persiste, todo serializado para evitar carreras.
 */
export async function mutate<T>(fn: (db: DBShape) => T): Promise<T> {
  let result!: T;
  writeChain = writeChain.then(async () => {
    const db = await load();
    result = fn(db);
    await persist(db);
  });
  await writeChain;
  return result;
}

/** Id corto único (sin dependencias). */
export function newId(prefix: string): string {
  const rnd = Math.floor(performance.now() * 1000)
    .toString(36)
    .slice(-6);
  const rnd2 = (globalThis.crypto?.randomUUID?.() || "x-x-x").split("-")[0];
  return `${prefix}-${rnd2}${rnd}`.toUpperCase();
}
