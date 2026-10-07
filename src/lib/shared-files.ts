import "server-only";
import {
  getDB,
  mutate,
  type SharedFileMeta,
  type FolderShare,
  type FolderPermLevel,
} from "@/lib/db";
import { makeDirectory } from "@/lib/webdav";

/**
 * Carpeta raíz compartida entre empleados y administradores.
 * Debe coincidir EXACTO con la carpeta creada en el NAS (/volume1/Archivos compartidos),
 * porque la ruta WebDAV distingue mayúsculas/minúsculas.
 */
export const SHARED_ROOT = "Archivos compartidos";
export const SHARED_SUBDIRS = ["Archivos", "Fotos"] as const;

/** ¿La ruta está dentro del área compartida? */
export function isShared(path: string): boolean {
  const p = (path || "").replace(/^\/+/, "");
  return p === SHARED_ROOT || p.startsWith(SHARED_ROOT + "/");
}

/** ¿La ruta es exactamente la raíz compartida? */
export function isSharedRoot(path: string): boolean {
  return (path || "").replace(/^\/+/, "").replace(/\/+$/, "") === SHARED_ROOT;
}

/** Primera subcarpeta después de SHARED_ROOT en una ruta (o null si es la raíz). */
export function sharedTopSubfolder(path: string): string | null {
  const p = (path || "").replace(/^\/+/, "");
  if (!p.startsWith(SHARED_ROOT + "/")) return null;
  return p.slice(SHARED_ROOT.length + 1).split("/")[0] || null;
}

/**
 * Carpeta de primer nivel (bajo SHARED_ROOT) que gobierna los permisos de una
 * ruta: los permisos se administran por subcarpeta de primer nivel y se heredan
 * a todo su contenido. null = la ruta está en la raíz compartida (sin carpeta
 * que la restrinja).
 */
export function sharedGoverningFolder(path: string): string | null {
  const top = sharedTopSubfolder(path);
  return top ? `${SHARED_ROOT}/${top}` : null;
}

/**
 * Subcarpetas de SHARED_ROOT visibles para el usuario. `null` = ve todas
 * (admins o empleados sin restricción configurada).
 */
export async function visibleSharedFolders(
  username: string,
): Promise<string[] | null> {
  const db = await getDB();
  const emp = db.employees.find(
    (e) => e.username.toLowerCase() === username.toLowerCase(),
  );
  if (!emp || emp.carpetasVisibles === undefined) return null;
  return emp.carpetasVisibles;
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

// ---- Compartición de carpetas con empleados seleccionados ----

function normalize(path: string): string {
  return (path || "").replace(/^\/+/, "").replace(/\/+$/, "");
}

/** Registro de compartición de una carpeta (o null si no tiene). */
export async function getFolderShare(path: string): Promise<FolderShare | null> {
  const db = await getDB();
  const p = normalize(path);
  return (db.folderShares || []).find((f) => f.path === p) || null;
}

/** Al crear una carpeta compartida, guarda a su dueño (visible para todos por defecto). */
export async function recordFolderCreated(
  path: string,
  usuario: string,
): Promise<void> {
  const p = normalize(path);
  await mutate((db) => {
    if (!db.folderShares) db.folderShares = [];
    if (db.folderShares.some((f) => f.path === p)) return;
    const now = Date.now();
    db.folderShares.push({
      path: p,
      sharedBy: usuario,
      allowed: null,
      createdAt: now,
      updatedAt: now,
    });
  });
}

/** Elimina el registro de una carpeta borrada (y sus descendientes). */
export async function removeFolderShare(path: string): Promise<void> {
  const p = normalize(path);
  await mutate((db) => {
    if (!db.folderShares) return;
    db.folderShares = db.folderShares.filter(
      (f) => f.path !== p && !f.path.startsWith(p + "/"),
    );
  });
}

const LEVELS: FolderPermLevel[] = ["total", "escritura", "lectura", "none"];

/**
 * Nivel efectivo de un usuario sobre una carpeta (estilo Windows). Admins y el
 * dueño siempre tienen acceso total. Sin registro de compartición, la carpeta
 * está abierta (todos pueden ver y editar). Con `perms` definido manda el modelo
 * nuevo; si no, se deduce del modelo antiguo (`allowed`).
 */
export function permOf(
  share: FolderShare | undefined,
  username: string,
  role: string,
): FolderPermLevel {
  if (role === "admin") return "total";
  const u = username.toLowerCase();
  if (!share) return "escritura";
  if (share.sharedBy.toLowerCase() === u) return "total";
  if (share.perms) {
    return share.perms[u] ?? share.defaultPerm ?? "none";
  }
  if (share.allowed === null) return "escritura";
  return share.allowed.some((a) => a.toLowerCase() === u) ? "escritura" : "none";
}

function canWriteLevel(p: FolderPermLevel): boolean {
  return p === "escritura" || p === "total";
}

/** Nivel efectivo (async, lee la DB). */
export async function folderPerm(
  username: string,
  role: string,
  path: string,
): Promise<FolderPermLevel> {
  if (role === "admin") return "total";
  const share = await getFolderShare(path);
  return permOf(share ?? undefined, username, role);
}

/** ¿El usuario puede escribir (subir/crear/mover) en esta carpeta? */
export async function canWriteFolder(
  username: string,
  role: string,
  path: string,
): Promise<boolean> {
  return canWriteLevel(await folderPerm(username, role, path));
}

/**
 * ¿Puede escribir en una ruta del área compartida? Resuelve la carpeta de
 * primer nivel que gobierna los permisos (herencia a subcarpetas). Si la ruta
 * está en la raíz compartida, se permite (no hay carpeta que la restrinja).
 */
export async function canWriteSharedPath(
  username: string,
  role: string,
  path: string,
): Promise<boolean> {
  if (role === "admin") return true;
  const gov = sharedGoverningFolder(path);
  if (!gov) return true;
  return canWriteFolder(username, role, gov);
}

/** ¿El usuario puede gestionar los permisos de esta carpeta? (acceso total) */
export async function canManageFolder(
  username: string,
  role: string,
  path: string,
): Promise<boolean> {
  if (role === "admin") return true;
  const share = await getFolderShare(path);
  return permOf(share ?? undefined, username, role) === "total";
}

/** ¿El usuario puede VER esta carpeta compartida? */
export async function canSeeFolder(
  username: string,
  role: string,
  path: string,
): Promise<boolean> {
  if (role === "admin") return true;
  const share = await getFolderShare(path);
  return permOf(share ?? undefined, username, role) !== "none";
}

/**
 * Define los permisos por usuario de una carpeta (modelo estilo Windows).
 * Solo el dueño o un admin. `perms` = nivel por username; `defaultPerm` = nivel
 * para "Todos los demás".
 */
export async function setFolderPerms(
  path: string,
  session: { username: string; role: string },
  perms: Record<string, FolderPermLevel>,
  defaultPerm: FolderPermLevel,
  hidden: boolean = true,
): Promise<{ ok: boolean; error?: string }> {
  const p = normalize(path);
  if (!(await canManageFolder(session.username, session.role, p))) {
    return { ok: false, error: "No puedes cambiar los permisos de esta carpeta." };
  }
  const clean: Record<string, FolderPermLevel> = {};
  for (const [k, v] of Object.entries(perms || {})) {
    if (LEVELS.includes(v)) clean[String(k).toLowerCase()] = v;
  }
  const def = LEVELS.includes(defaultPerm) ? defaultPerm : "escritura";
  await mutate((db) => {
    if (!db.folderShares) db.folderShares = [];
    const now = Date.now();
    const existing = db.folderShares.find((f) => f.path === p);
    if (existing) {
      existing.perms = clean;
      existing.defaultPerm = def;
      existing.hidden = hidden;
      existing.allowed = null; // manda el modelo nuevo
      existing.updatedAt = now;
    } else {
      db.folderShares.push({
        path: p,
        sharedBy: session.username,
        allowed: null,
        perms: clean,
        defaultPerm: def,
        hidden,
        createdAt: now,
        updatedAt: now,
      });
    }
  });
  return { ok: true };
}

/**
 * Define con quién está compartida una carpeta. Solo el dueño o un admin.
 * `allowed` = null (todos) o lista de usernames.
 */
export async function setFolderShare(
  path: string,
  session: { username: string; role: string },
  allowed: string[] | null,
): Promise<{ ok: boolean; error?: string }> {
  const p = normalize(path);
  if (!(await canManageFolder(session.username, session.role, p))) {
    return { ok: false, error: "No puedes cambiar el acceso de esta carpeta." };
  }
  await mutate((db) => {
    if (!db.folderShares) db.folderShares = [];
    const now = Date.now();
    const existing = db.folderShares.find((f) => f.path === p);
    const clean = allowed === null ? null : [...new Set(allowed.map(String).filter(Boolean))];
    if (existing) {
      existing.allowed = clean;
      existing.updatedAt = now;
    } else {
      db.folderShares.push({
        path: p,
        sharedBy: session.username,
        allowed: clean,
        createdAt: now,
        updatedAt: now,
      });
    }
  });
  return { ok: true };
}

/** Directorio de empleados (para el selector de compartición). */
export async function employeeDirectory(): Promise<
  { username: string; nombre: string }[]
> {
  const db = await getDB();
  return db.employees.map((e) => ({ username: e.username, nombre: e.nombre }));
}

// ---- Versiones en memoria (para filtrar un listado sin N lecturas de disco) ----

export async function allFolderShares(): Promise<FolderShare[]> {
  const db = await getDB();
  return db.folderShares || [];
}

function shareOf(shares: FolderShare[], path: string): FolderShare | undefined {
  const p = normalize(path);
  return shares.find((f) => f.path === p);
}

/** Nivel efectivo usando la lista de shares ya cargada (sin leer disco). */
export function permWith(
  shares: FolderShare[],
  username: string,
  role: string,
  path: string,
): FolderPermLevel {
  return permOf(shareOf(shares, path), username, role);
}

export function canSeeWith(
  shares: FolderShare[],
  username: string,
  role: string,
  path: string,
): boolean {
  return permWith(shares, username, role, path) !== "none";
}

export function canWriteWith(
  shares: FolderShare[],
  username: string,
  role: string,
  path: string,
): boolean {
  return canWriteLevel(permWith(shares, username, role, path));
}

export function canManageWith(
  shares: FolderShare[],
  username: string,
  role: string,
  path: string,
): boolean {
  return permWith(shares, username, role, path) === "total";
}

/**
 * ¿La carpeta se oculta a quien no tiene acceso? (el "ojito"). Por defecto sí:
 * sin registro, o con `hidden` sin definir, se comporta como antes (oculta).
 */
export function hiddenWith(shares: FolderShare[], path: string): boolean {
  const share = shareOf(shares, path);
  return share?.hidden ?? true;
}

/** ¿La carpeta está restringida (alguien con solo lectura o sin acceso)? */
export function isRestrictedWith(shares: FolderShare[], path: string): boolean {
  const share = shareOf(shares, path);
  if (!share) return false;
  if (share.perms) {
    const def = share.defaultPerm ?? "none";
    if (def === "none" || def === "lectura") return true;
    return Object.values(share.perms).some((p) => p === "none" || p === "lectura");
  }
  return share.allowed !== null;
}

/** Dueño y fecha de creación de una carpeta compartida (o null si no hay registro). */
export function folderMetaWith(
  shares: FolderShare[],
  path: string,
): { sharedBy: string; createdAt: number } | null {
  const s = shareOf(shares, path);
  return s ? { sharedBy: s.sharedBy, createdAt: s.createdAt } : null;
}

/**
 * Asegura que los empleados dados puedan VER la subcarpeta `folderName` dentro
 * de "Archivos compartidos". Solo afecta a quienes tienen una restricción
 * (carpetasVisibles definida); a los demás (ven todo) no les cambia nada. Así,
 * una carpeta recién compartida no queda oculta por la restricción del admin.
 */
export async function grantTopFolderVisibility(
  usernames: string[],
  folderName: string,
): Promise<void> {
  const wanted = usernames.map((u) => u.toLowerCase());
  await mutate((db) => {
    for (const emp of db.employees) {
      if (!wanted.includes(emp.username.toLowerCase())) continue;
      if (emp.carpetasVisibles === undefined) continue; // ya ve todo
      if (!emp.carpetasVisibles.includes(folderName)) {
        emp.carpetasVisibles.push(folderName);
      }
    }
  });
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
