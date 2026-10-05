import "server-only";
import { getDB, mutate, newId, type TrashEntry } from "@/lib/db";
import { moveEntry, deleteEntry, makeDirectory } from "@/lib/webdav";
import { SHARED_ROOT } from "@/lib/shared-files";

/**
 * Carpeta de papelera dentro del área compartida (escribible por todas las
 * cuentas del NAS). Se oculta de la navegación y del panel de permisos.
 */
export const TRASH_ROOT = `${SHARED_ROOT}/Papelera`;

interface Creds {
  username: string;
  password: string;
}

function normalize(p: string): string {
  return (p || "").replace(/^\/+/, "").replace(/\/+$/, "");
}

function basename(p: string): string {
  return normalize(p).split("/").pop() || "";
}

/** ¿La ruta está dentro de la papelera? */
export function isInTrash(path: string): boolean {
  const p = normalize(path);
  return p === TRASH_ROOT || p.startsWith(TRASH_ROOT + "/");
}

/**
 * Envía un archivo/carpeta a la papelera: lo mueve a la carpeta de papelera y
 * registra de dónde salió para poder restaurarlo. No borra nada del NAS.
 */
export async function trashItem(
  creds: Creds,
  username: string,
  originalPath: string,
  isDir: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const src = normalize(originalPath);
  if (!src || isInTrash(src)) {
    return { ok: false, error: "Ruta inválida." };
  }
  const name = basename(src);
  const id = newId("TRS");
  const trashPath = `${TRASH_ROOT}/${id}__${name}`;

  try {
    await makeDirectory(creds, TRASH_ROOT);
    const mv = await moveEntry(creds, src, trashPath);
    if (!mv.ok) {
      return { ok: false, error: "No se pudo mover a la papelera." };
    }
  } catch {
    return { ok: false, error: "No se pudo contactar al NAS." };
  }

  await mutate((db) => {
    if (!db.trash) db.trash = [];
    db.trash.push({
      id,
      nombre: name,
      originalPath: src,
      trashPath,
      isDir,
      deletedBy: username,
      deletedAt: Date.now(),
    });
  });
  return { ok: true };
}

/** Lista la papelera: el admin ve todo; el empleado solo lo que él envió. */
export async function listTrash(
  username: string,
  role: string,
): Promise<TrashEntry[]> {
  const db = await getDB();
  const u = username.toLowerCase();
  const all = [...(db.trash || [])].sort((a, b) => b.deletedAt - a.deletedAt);
  if (role === "admin") return all;
  return all.filter((t) => t.deletedBy.toLowerCase() === u);
}

/** ¿Puede este usuario restaurar/eliminar esta entrada? (admin o su dueño) */
function ownsEntry(entry: TrashEntry, username: string, role: string): boolean {
  return (
    role === "admin" ||
    entry.deletedBy.toLowerCase() === username.toLowerCase()
  );
}

/** Restaura una entrada a su ubicación original. Admin o quien la envió. */
export async function restoreItem(
  creds: Creds,
  username: string,
  role: string,
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const db = await getDB();
  const entry = (db.trash || []).find((t) => t.id === id);
  if (!entry) return { ok: false, error: "No se encontró el elemento." };
  if (!ownsEntry(entry, username, role)) {
    return { ok: false, error: "No puedes restaurar este elemento." };
  }

  try {
    const mv = await moveEntry(creds, entry.trashPath, entry.originalPath);
    if (!mv.ok) {
      if (mv.status === 412) {
        return {
          ok: false,
          error: "Ya existe algo en la ubicación original. Renómbralo o muévelo antes de restaurar.",
        };
      }
      return { ok: false, error: "No se pudo restaurar." };
    }
  } catch {
    return { ok: false, error: "No se pudo contactar al NAS." };
  }

  await mutate((d) => {
    if (d.trash) d.trash = d.trash.filter((t) => t.id !== id);
  });
  return { ok: true };
}

/** Elimina definitivamente una entrada (solo admin). */
export async function deleteTrashEntry(
  creds: Creds,
  role: string,
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  if (role !== "admin") {
    return { ok: false, error: "Solo un administrador puede vaciar la papelera." };
  }
  const db = await getDB();
  const entry = (db.trash || []).find((t) => t.id === id);
  if (!entry) return { ok: false, error: "No se encontró el elemento." };

  try {
    await deleteEntry(creds, entry.trashPath);
  } catch {
    /* si el NAS ya no lo tiene, igual limpiamos el registro */
  }
  await mutate((d) => {
    if (d.trash) d.trash = d.trash.filter((t) => t.id !== id);
  });
  return { ok: true };
}

/** Vacía toda la papelera (solo admin): borra definitivamente cada elemento. */
export async function emptyTrash(
  creds: Creds,
  role: string,
): Promise<{ ok: boolean; error?: string }> {
  if (role !== "admin") {
    return { ok: false, error: "Solo un administrador puede vaciar la papelera." };
  }
  const db = await getDB();
  for (const entry of db.trash || []) {
    try {
      await deleteEntry(creds, entry.trashPath);
    } catch {
      /* continúa con los demás */
    }
  }
  await mutate((d) => {
    d.trash = [];
  });
  return { ok: true };
}
