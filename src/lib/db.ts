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

export interface Employee {
  id: string;
  /** Usuario del NAS (coincide con su login). */
  username: string;
  nombre: string;
  email: string;
  rol: string;
  ranking: number;
  habilidades: string[];
  proyectoId: string | null;
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

export interface DBShape {
  projects: Project[];
  employees: Employee[];
  materials: MaterialRequest[];
  attendance: Attendance[];
  messages: Message[];
}

const EMPTY: DBShape = {
  projects: [],
  employees: [],
  materials: [],
  attendance: [],
  messages: [],
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
