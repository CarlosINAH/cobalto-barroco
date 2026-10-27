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
  // ── Datos de obra / administración (hoja OBRAS del Excel). Opcionales y
  //    solo-admin: son montos de dinero. ──
  /** Cliente de la obra. */
  cliente?: string;
  /** Tipo de trabajo (mural, escultura, retablo, vitral…). */
  tipo?: string;
  /** Monto total contratado (MXN). */
  montoTotal?: number;
  /** Anticipo recibido. */
  anticipo?: number;
  /** Egresos reales de la obra. */
  egresos?: number;
  /** Utilidad real de la obra. */
  utilidad?: number;
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
  /**
   * Acciones globales permitidas (matriz del Excel "USUARIOS SERVIDOR").
   * undefined = todas permitidas (no restringido). Los admins siempre pueden.
   */
  acciones?: EmployeeAcciones;
  /**
   * Perfil del sistema. Determina el acceso sugerido; el acceso real por sección
   * vive en `acceso`. undefined = restaurador (empleado base).
   */
  perfil?: PerfilSistema;
  /**
   * Acceso por sección sensible (administración, proyectos/presupuesto), estilo
   * carpetas: "oculto" | "lectura" | "total". Lo configura el admin en
   * Configuración. undefined / sin entrada = oculto (no ve la sección).
   */
  acceso?: Partial<Record<SeccionSistema, AccesoNivel>>;
  /** ¿Puede borrar/vaciar elementos de la papelera? (admins siempre pueden). */
  papeleraBorrar?: boolean;
  /** Proyecto principal asignado (compatibilidad). */
  proyectoId: string | null;
  /**
   * Proyectos/obras en los que participa (un restaurador puede estar en varios).
   * Es la fuente para "Mis proyectos" del panel del empleado. Si está vacío, se
   * usa `proyectoId` como respaldo.
   */
  proyectoIds?: string[];
  createdAt: number;
}

/** Perfiles del sistema, de mayor a menor alcance. */
export type PerfilSistema =
  | "administracion"
  | "superintendente"
  | "residente"
  | "restaurador";

/** Secciones sensibles con control de acceso por persona. */
export type SeccionSistema = "administracion" | "proyectos";

/** Nivel de acceso a una sección (igual que las carpetas compartidas). */
export type AccesoNivel = "oculto" | "lectura" | "total";

/** Autorización de acciones sobre archivos (del Excel). */
export interface EmployeeAcciones {
  subir: boolean;
  descargar: boolean;
  borrar: boolean;
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
  /**
   * ¿La carpeta se oculta a quien no tiene acceso? (el "ojito").
   * true (por defecto) = quien no puede entrar tampoco la ve.
   * false = quien no puede entrar la ve en gris con candado, pero no entra.
   */
  hidden?: boolean;
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
  /** Empleados señalados como integrantes del evento (usernames del NAS). */
  integrantes: string[];
  /** Minutos antes del evento para el recordatorio por correo; null = sin recordatorio. */
  recordatorioMin: number | null;
  /** Ya se envió el recordatorio por correo (para no repetirlo). */
  recordatorioEnviado: boolean;
  creadoPor: string;
  creadoEn: number;
}

// ───────────────────────────────────────────────────────────────────────────
// Módulo de costos / Precios Unitarios (P.U.)
//
// Replica en código el flujo del Excel de presupuestos. Los catálogos
// (materiales, recetas, salarios, conceptos) son GLOBALES y reutilizables entre
// proyectos; el presupuesto (Budget) es por proyecto. El cálculo vive en
// `src/lib/pu.ts` (funciones puras): precio de catálogo → costo directo →
// P.U. = CD × (1 + indirectos) × (1 + utilidad).
// ───────────────────────────────────────────────────────────────────────────

/** Factores por defecto tomados del Excel (hoja P.U.). */
export const FACTOR_INDIRECTOS = 0.25;
export const FACTOR_UTILIDAD = 0.3;
export const FACTOR_IVA = 0.16;

/** Clasificación de un insumo dentro de una matriz de P.U. */
export type CostInputKind =
  | "material"
  | "herramienta"
  | "equipo"
  | "mano_obra"
  | "receta";

/**
 * Insumo del catálogo global de precios (hoja ` MATERIALES`): material,
 * herramienta o equipo, con su precio de compra y enlace al proveedor.
 */
export interface CostMaterial {
  id: string;
  nombre: string;
  kind: "material" | "herramienta" | "equipo";
  /** Etapa/proceso del catálogo: PRELIMINARES, EMBALAJE, LIMPIEZA FINA, … */
  categoria: string;
  /** Precio unitario de compra (MXN). */
  precio: number;
  /** Presentación/unidad de compra (p. ej. "1 L", "100 pzas"). */
  unidad: string;
  /** Enlace de compra. */
  url?: string;
  supplierId?: string | null;
  nota?: string;
  /** Última actualización del precio (para historial de costos). */
  actualizadoEn: number;
  createdAt: number;
}

/** Componente de una receta: un material base consumido por una fracción. */
export interface RecipeComponent {
  /** Referencia a un CostMaterial del catálogo (o null si es externo). */
  materialId: string | null;
  /** Referencia a otra receta anidada (p. ej. BOL usa AGUA COLA). */
  recipeId?: string | null;
  /** Snapshot legible por si la referencia se borra. */
  nombre: string;
  unidad: string;
  /** Precio unitario de compra usado en el cálculo. */
  precio: number;
  /** Fracción/rendimiento consumido del envase. */
  cantidad: number;
}

/**
 * Solución/mezcla compuesta (hoja `RECETAS`). Su costo calculado se usa luego
 * como un "material" más dentro de las matrices de P.U.
 */
export interface Recipe {
  id: string;
  nombre: string;
  /** Rendimiento del lote (p. ej. "1 L", "950 ML"). */
  rendimiento: string;
  unidad: string;
  componentes: RecipeComponent[];
  /** Costo del lote = suma de componentes (cache calculado). */
  costo: number;
  /** "Final" del Excel (costo + indirectos); informativo. */
  costoFinal?: number;
  nota?: string;
  createdAt: number;
}

/** Tarifa de mano de obra por rol (hoja `SALARIOS`), en MXN. */
export interface LaborRate {
  id: string;
  rol: string;
  /** Jornada de 8 h. */
  jornada: number;
  hora: number;
  semana: number;
  mes: number;
  createdAt: number;
}

/** Renglón de insumo dentro de la matriz de P.U. de un concepto. */
export interface ConceptInput {
  kind: CostInputKind;
  /** CostMaterial.id, Recipe.id o LaborRate.id según `kind`. */
  refId: string | null;
  /** Snapshot del nombre/unidad/precio por resiliencia y legibilidad. */
  nombre: string;
  unidad: string;
  precio: number;
  /** Rendimiento/consumo por unidad de obra. */
  cantidad: number;
  /**
   * Factor de depreciación (0..1) para equipo/herramienta/material: la fracción
   * del precio que se carga al concepto (p. ej. 0.1 = 10% del costo del equipo).
   * undefined = 1 (100%, se usa completo). No aplica a mano de obra ni recetas.
   */
  depreciacion?: number;
}

/**
 * Concepto de obra con su matriz de P.U. (hojas `1`..`n` + `P.U.`). Puede ser
 * de catálogo global (reutilizable) o propio de un presupuesto.
 */
export interface Concept {
  id: string;
  clave: string;
  concepto: string;
  descripcion: string;
  unidad: string;
  insumos: ConceptInput[];
  factorIndirectos: number;
  factorUtilidad: number;
  /** Jornadas por unidad de obra (para el cronograma); null si no aplica. */
  tiempoPU?: number | null;
  /** Calculados (cache; la verdad la da `pu.ts`). */
  costoDirecto: number;
  pu: number;
  /** true = concepto de catálogo reutilizable entre proyectos. */
  global: boolean;
  createdAt: number;
}

/** Línea de un presupuesto: un concepto con su cantidad para el proyecto. */
export interface BudgetLine {
  conceptId: string | null;
  /** Snapshot del concepto al momento de presupuestar (la cotización se congela). */
  clave: string;
  concepto: string;
  descripcion: string;
  unidad: string;
  pu: number;
  cantidad: number;
  /** Jornadas por unidad (cronograma). */
  tiempoPU?: number | null;
}

/**
 * Ciclo de vida de un presupuesto:
 * - borrador: en elaboración.
 * - enviado: entregado al cliente, esperando respuesta.
 * - aprobado: aceptado → se convierte en proyecto (projectId queda ligado).
 * - rechazado: no procedió (se conserva como historial).
 */
export type BudgetEstado = "borrador" | "enviado" | "aprobado" | "rechazado";

/** Presupuesto/cotización (hojas `COTIZACIÓN`/`CRONO`). */
export interface Budget {
  id: string;
  /**
   * Proyecto ligado, o null si aún es solo un presupuesto (todavía no
   * aprobado). Al aprobarse se crea el proyecto y se llena este campo.
   */
  projectId: string | null;
  nombre: string;
  cliente: string;
  /** Nombre de la obra propuesta (cuando aún no hay proyecto). */
  obra?: string;
  /** Estado del ciclo de vida; por defecto "borrador". */
  estado?: BudgetEstado;
  lineas: BudgetLine[];
  factorIva: number;
  factorIndirectos: number;
  factorUtilidad: number;
  /** Tamaño de cuadrilla para el cronograma (personas trabajando en paralelo). */
  personas?: number;
  /** Fecha de inicio del cronograma (YYYY-MM-DD). */
  cronoInicio?: string;
  /** Días de descanso del cronograma (0=domingo … 6=sábado). */
  cronoDescanso?: number[];
  /** Fecha de envío al cliente (epoch ms). */
  enviadoEn?: number;
  /** Fecha en que se aprobó o rechazó (epoch ms). */
  decididoEn?: number;
  createdAt: number;
  updatedAt: number;
}

/** Movimiento financiero de un proyecto (hoja `ADMINISTRACIÓN` / OBRAS). */
export type LedgerKind = "ingreso" | "egreso";
export interface LedgerEntry {
  id: string;
  /** Proyecto, o null = gasto general de la empresa. */
  projectId: string | null;
  fecha: string; // YYYY-MM-DD
  /** anticipo, finiquito, pago, egreso, indirectos, impuestos, adquisiciones, utilidades, nómina, otro. */
  categoria: string;
  /**
   * Subgrupo dentro de la categoría (p. ej. en Indirectos: "SERVICIOS",
   * "VIÁTICOS"; en Adquisiciones: "MATERIAL", "EQUIPO"). Replica los bloques de
   * las hojas de Administración del Excel; opcional.
   */
  subcategoria?: string;
  tipo: LedgerKind;
  concepto: string;
  monto: number;
  createdAt: number;
}

/** Pago de nómina de un proyecto (hoja `NÓMINA`). */
export interface PayrollEntry {
  id: string;
  /** Proyecto al que pertenece, o null = nómina de la empresa (administrativa). */
  projectId: string | null;
  persona: string;
  rol?: string;
  /** Etiqueta de periodo (quincena/fecha), libre. */
  periodo: string;
  /** Fecha del pago (YYYY-MM-DD) para los cálculos mensual/trimestral. */
  fecha?: string;
  /** Categoría: nómina, aguinaldo, nómina externo, etc. */
  categoria?: string;
  monto: number;
  pagado: boolean;
  nota?: string;
  createdAt: number;
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
  // Módulo de costos / P.U.
  costMaterials: CostMaterial[];
  recipes: Recipe[];
  laborRates: LaborRate[];
  concepts: Concept[];
  budgets: Budget[];
  ledgerEntries: LedgerEntry[];
  payrollEntries: PayrollEntry[];
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
  costMaterials: [],
  recipes: [],
  laborRates: [],
  concepts: [],
  budgets: [],
  ledgerEntries: [],
  payrollEntries: [],
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
