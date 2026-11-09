import "server-only";
import { getDB, mutate, type SharedFileMeta } from "@/lib/db";
import { makeDirectory, makeDirectoryDeep } from "@/lib/webdav";

/**
 * Carpeta raíz de proyectos en el NAS. Debe existir en la raíz WebDAV con este
 * nombre exacto (distingue mayúsculas/minúsculas).
 * Configurable vía NAS_PROJECTS_ROOT; por defecto "Archivos compartidos/PROYECTOS_COBALTO".
 * Dentro: una subcarpeta por proyecto; dentro de cada proyecto, "compartido"
 * es la única carpeta que los empleados pueden ver/subir.
 */
export const SHARED_ROOT =
  process.env.NAS_PROJECTS_ROOT ?? "Archivos compartidos/PROYECTOS_COBALTO";

/** ¿La ruta está dentro del área compartida? */
export function isShared(path: string): boolean {
  const p = (path || "").replace(/^\/+/, "");
  return p === SHARED_ROOT || p.startsWith(SHARED_ROOT + "/");
}

/** ¿La ruta es exactamente la raíz compartida? */
export function isSharedRoot(path: string): boolean {
  return (path || "").replace(/^\/+/, "").replace(/\/+$/, "") === SHARED_ROOT;
}

function normalize(path: string): string {
  return (path || "").replace(/^\/+/, "").replace(/\/+$/, "");
}

// ---- Acceso por convención "compartido" (modelo simple) ----
// Regla única: el acceso a un proyecto se decide por ASIGNACIÓN. Dentro de la
// carpeta de cada proyecto, "compartido" es lo único que ven los empleados; un
// nivel arriba (balance, administración, minutas…) es solo para admins.

/** Subcarpeta compartida de una carpeta de proyecto. */
export function compartidoOf(carpeta: string): string {
  return `${normalize(carpeta)}/compartido`;
}

/**
 * Carpetas de proyecto (con `carpetaInformes`) que la sesión puede ver.
 * admin: todas; empleado: solo las de sus proyectos asignados.
 */
export async function sessionProjectFolders(session: {
  username: string;
  role: string;
}): Promise<{ id: string; nombre: string; carpeta: string }[]> {
  const db = await getDB();
  const withFolder = db.projects.filter((p) => p.carpetaInformes);
  if (session.role === "admin") {
    return withFolder.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      carpeta: p.carpetaInformes as string,
    }));
  }
  const u = session.username.toLowerCase();
  const emp = db.employees.find((e) => e.username.toLowerCase() === u);
  const ids = emp?.proyectoIds?.length
    ? emp.proyectoIds
    : emp?.proyectoId
      ? [emp.proyectoId]
      : [];
  return withFolder
    .filter((p) => ids.includes(p.id))
    .map((p) => ({
      id: p.id,
      nombre: p.nombre,
      carpeta: p.carpetaInformes as string,
    }));
}

/**
 * ¿La sesión puede acceder a esta ruta del NAS?
 * admin: sí; empleado: solo dentro de `[proyecto asignado]/compartido`.
 * Vale tanto para leer como para escribir (los empleados escriben en compartido).
 */
export async function canAccessNasPath(
  session: { username: string; role: string },
  rawPath: string,
): Promise<boolean> {
  if (session.role === "admin") return true;
  const path = normalize(rawPath);
  const folders = await sessionProjectFolders(session);
  return folders.some((f) => {
    const base = compartidoOf(f.carpeta);
    return path === base || path.startsWith(base + "/");
  });
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

/**
 * Limita cuánto esperamos una promesa (p. ej. una llamada al NAS). Si no
 * resuelve en `ms`, devuelve `fallback`. Evita que un NAS lento o caído bloquee
 * el render de una página en el servidor: la página carga igual, en modo
 * degradado, en vez de quedarse "sin cargar".
 */
export function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    p.catch(() => fallback),
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

/** Crea la carpeta raíz de proyectos si no existe. */
export async function ensureSharedStructure(creds: {
  username: string;
  password: string;
}): Promise<boolean> {
  try {
    await makeDirectory(creds, SHARED_ROOT);
    return true;
  } catch {
    return false;
  }
}

/**
 * Estructura estándar de carpetas del servidor (del Excel "ORGANIZACIÓN DEL
 * SERVIDOR"), relativa a SHARED_ROOT. Se define como árbol anidado y se aplana
 * en orden padre→hijo para crearla de una sola vez. ESTADO y TIPO DE BIEN son
 * plantillas: el usuario las renombra/llena por proyecto.
 */
interface FolderTree {
  [name: string]: FolderTree;
}

const PROYECTO_PLANTILLA: FolderTree = {
  "EJECUTADO": { "ESTADO": { "TIPO DE BIEN": {} } },
  "NO EJECUTADO": { "ESTADO": { "TIPO DE BIEN": {} } },
};

const STANDARD_TREE: FolderTree = {
  "CV": {},
  "PLANTILLAS": {},
  "ECONÓMICO": {
    "PRESUPUESTOS": {},
    "BALANCE DE OBRA": {},
    "RENDIMIENTOS": {},
  },
  "GABINETE": {
    "INAH": { "PROYECTO 06": {}, "INFORME": {} },
    "DGPU": { "INFORME": {} },
    "PARTICULARES": { "FICHA": {}, "INFORME": {} },
  },
  "PROYECTOS": {
    "2025": PROYECTO_PLANTILLA,
    "2026": PROYECTO_PLANTILLA,
  },
  "DIRECTORIO": {
    "MANO DE OBRA": { "RESTAURADORXS": {}, "TÉCNICXS": {} },
    "PROVEEDORES": {},
  },
  "INVENTARIO": {},
};

/** Aplana el árbol a rutas relativas a SHARED_ROOT, en orden padre→hijo. */
function flattenTree(tree: FolderTree, prefix = ""): string[] {
  const out: string[] = [];
  for (const [name, children] of Object.entries(tree)) {
    const rel = prefix ? `${prefix}/${name}` : name;
    out.push(rel);
    out.push(...flattenTree(children, rel));
  }
  return out;
}

/** Rutas (relativas a SHARED_ROOT) de la estructura estándar. */
export function standardStructurePaths(): string[] {
  return flattenTree(STANDARD_TREE);
}

/** Carpetas de primer nivel de la estructura estándar. */
export function standardTopFolders(): string[] {
  return Object.keys(STANDARD_TREE);
}

/**
 * Crea la estructura estándar del servidor bajo SHARED_ROOT en el NAS. Es
 * idempotente: una carpeta existente no cuenta como error (MKCOL 405).
 */
export async function createStandardStructure(creds: {
  username: string;
  password: string;
}): Promise<{ ok: boolean; created: number; total: number }> {
  const rels = standardStructurePaths();
  let created = 0;
  try {
    await makeDirectory(creds, SHARED_ROOT);
    for (const rel of rels) {
      const ok = await makeDirectoryDeep(creds, `${SHARED_ROOT}/${rel}`);
      if (ok) created++;
    }
  } catch {
    return { ok: false, created, total: rels.length };
  }
  return { ok: created > 0, created, total: rels.length };
}
