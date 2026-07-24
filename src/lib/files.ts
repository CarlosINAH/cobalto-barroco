import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Session } from "@/lib/session";

/**
 * Capa de archivos de la plataforma. Los archivos viven en un volumen del NAS
 * montado en FILES_ROOT. El aislamiento lo impone la app:
 *  - un empleado solo puede tocar  Empleados/<su-usuario>/...
 *  - un admin puede navegar toda la raíz.
 */

export interface FileEntry {
  name: string;
  path: string; // ruta relativa a la raíz permitida del usuario
  isDir: boolean;
  size: number;
  modified: number; // epoch ms
}

function root(): string {
  return process.env.FILES_ROOT || "/files";
}

export const EMPLEADOS_DIR = "Empleados";
export const PROYECTOS_DIR = "Proyectos";

/** Carpeta base permitida para la sesión (absoluta). */
function baseDirFor(session: Session): string {
  if (session.role === "admin") return root();
  return path.join(root(), EMPLEADOS_DIR, session.username);
}

/**
 * Resuelve una ruta relativa dentro de la base permitida del usuario,
 * bloqueando cualquier intento de salir (../). Lanza si es inválida.
 */
function resolveScoped(session: Session, relPath: string): string {
  const base = baseDirFor(session);
  const clean = (relPath || "")
    .split(/[\\/]+/)
    .filter((s) => s && s !== "." && s !== "..")
    .join(path.sep);
  const full = path.resolve(base, clean);
  const rel = path.relative(base, full);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error("forbidden_path");
  }
  return full;
}

/** Convierte una ruta absoluta a su forma relativa (para el cliente). */
function toRel(session: Session, absPath: string): string {
  const base = baseDirFor(session);
  const rel = path.relative(base, absPath);
  return rel.split(path.sep).join("/");
}

/** Asegura que la carpeta base del usuario exista (repo personal). */
export async function ensureBase(session: Session): Promise<void> {
  await fs.mkdir(baseDirFor(session), { recursive: true });
}

/** Lista el contenido de una carpeta (relativa a la base del usuario). */
export async function listDir(
  session: Session,
  relPath = "",
): Promise<FileEntry[]> {
  const abs = resolveScoped(session, relPath);
  await fs.mkdir(abs, { recursive: true });
  const dirents = await fs.readdir(abs, { withFileTypes: true });
  const out: FileEntry[] = [];
  for (const d of dirents) {
    if (d.name.startsWith(".")) continue;
    const childAbs = path.join(abs, d.name);
    let size = 0;
    let modified = 0;
    try {
      const st = await fs.stat(childAbs);
      size = st.size;
      modified = st.mtimeMs;
    } catch {
      /* ignore */
    }
    out.push({
      name: d.name,
      path: toRel(session, childAbs),
      isDir: d.isDirectory(),
      size,
      modified,
    });
  }
  // Carpetas primero, luego por nombre.
  out.sort((a, b) =>
    a.isDir === b.isDir
      ? a.name.localeCompare(b.name, "es")
      : a.isDir
        ? -1
        : 1,
  );
  return out;
}

/** Devuelve la ruta absoluta de un archivo para descarga (valida scope). */
export async function resolveForDownload(
  session: Session,
  relPath: string,
): Promise<{ abs: string; name: string; size: number }> {
  const abs = resolveScoped(session, relPath);
  const st = await fs.stat(abs);
  if (st.isDirectory()) throw new Error("is_directory");
  return { abs, name: path.basename(abs), size: st.size };
}

/** Crea una carpeta. */
export async function makeDir(
  session: Session,
  relPath: string,
): Promise<void> {
  const abs = resolveScoped(session, relPath);
  await fs.mkdir(abs, { recursive: true });
}

/** Guarda un archivo subido. */
export async function saveFile(
  session: Session,
  dirRelPath: string,
  fileName: string,
  data: Uint8Array,
): Promise<void> {
  const safeName = path.basename(fileName).replace(/[\\/]/g, "_");
  const abs = resolveScoped(session, path.join(dirRelPath || "", safeName));
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, data);
}

/** Borra un archivo o carpeta (recursivo). */
export async function removeEntry(
  session: Session,
  relPath: string,
): Promise<void> {
  if (!relPath) throw new Error("forbidden_path");
  const abs = resolveScoped(session, relPath);
  if (abs === baseDirFor(session)) throw new Error("forbidden_path");
  await fs.rm(abs, { recursive: true, force: true });
}
