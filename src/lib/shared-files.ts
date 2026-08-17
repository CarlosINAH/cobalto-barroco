import "server-only";
import { getDB, mutate, type SharedFileMeta } from "@/lib/db";
import { makeDirectory } from "@/lib/webdav";

/** Carpeta raíz compartida entre empleados y administradores. */
export const SHARED_ROOT = "Archivos Compartidos";
export const SHARED_SUBDIRS = ["Archivos", "Fotos"] as const;

/** ¿La ruta está dentro del área compartida? */
export function isShared(path: string): boolean {
  const p = (path || "").replace(/^\/+/, "");
  return p === SHARED_ROOT || p.startsWith(SHARED_ROOT + "/");
}

/**
 * Registra que un archivo se subió o modificó a través de la plataforma.
 * Si es la primera vez, guarda al autor original y la fecha de subida.
 */
export async function recordFileEvent(
  path: string,
  nombre: string,
  usuario: string,
): Promise<void> {
  await mutate((db) => {
    if (!db.sharedFiles) db.sharedFiles = [];
    const now = Date.now();
    const existing = db.sharedFiles.find((f) => f.path === path);
    if (existing) {
      existing.historial.push({ usuario, accion: "modificado", fecha: now });
      existing.ultimaAccion = now;
      existing.nombre = nombre;
    } else {
      db.sharedFiles.push({
        path,
        nombre,
        subidoPor: usuario,
        subidoEn: now,
        ultimaAccion: now,
        historial: [{ usuario, accion: "subido", fecha: now }],
      });
    }
  });
}

/** Elimina los metadatos del archivo borrado (o de la carpeta y su contenido). */
export async function recordDelete(path: string): Promise<void> {
  await mutate((db) => {
    if (!db.sharedFiles) return;
    db.sharedFiles = db.sharedFiles.filter(
      (f) => f.path !== path && !f.path.startsWith(path + "/"),
    );
  });
}

/** Metadatos indexados por ruta, para fusionarlos con el listado del NAS. */
export async function metaForPaths(
  paths: string[],
): Promise<Record<string, SharedFileMeta>> {
  const db = await getDB();
  const set = new Set(paths);
  const out: Record<string, SharedFileMeta> = {};
  for (const f of db.sharedFiles || []) {
    if (set.has(f.path)) out[f.path] = f;
  }
  return out;
}

/** Historial completo de un archivo compartido. */
export async function getMeta(path: string): Promise<SharedFileMeta | null> {
  const db = await getDB();
  return (db.sharedFiles || []).find((f) => f.path === path) || null;
}

/** Crea la estructura "Archivos Compartidos/{Archivos,Fotos}" si no existe. */
export async function ensureSharedStructure(creds: {
  username: string;
  password: string;
}): Promise<boolean> {
  try {
    await makeDirectory(creds, SHARED_ROOT);
    for (const sub of SHARED_SUBDIRS) {
      await makeDirectory(creds, `${SHARED_ROOT}/${sub}`);
    }
    return true;
  } catch {
    return false;
  }
}
