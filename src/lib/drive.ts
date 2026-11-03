import "server-only";
import { getDB, mutate } from "@/lib/db";
import { decryptSecret } from "@/lib/session";
import { googleRefreshAccessToken } from "@/lib/google";

/** Nombre de la carpeta de trabajo única del equipo dentro del Drive central. */
export const WORKSPACE_FOLDER_NAME = "PROYECTOS_COBALTO";

/**
 * Acceso al Drive central de la empresa. La conexión (refresh token cifrado) se
 * guarda en la base de datos; aquí se resuelve un access token fresco y se
 * ofrecen las operaciones básicas (listar, crear carpeta, subir, descargar) vía
 * la API REST de Google Drive v3.
 */

const FILES_URL = "https://www.googleapis.com/drive/v3/files";
const UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files";

export interface DriveEntry {
  id: string;
  name: string;
  mimeType: string;
  isFolder: boolean;
  size?: number;
  modifiedTime?: string;
  webViewLink?: string;
}

/** ¿Hay un Drive central conectado? */
export async function driveConnected(): Promise<boolean> {
  const db = await getDB();
  return !!db.googleDrive?.refreshTokenEnc;
}

/** Correo de la cuenta central conectada (si hay). */
export async function driveAccountEmail(): Promise<string | null> {
  const db = await getDB();
  return db.googleDrive?.email ?? null;
}

/** Access token fresco del Drive central, o null si no está conectado/falla. */
export async function driveAccessToken(): Promise<string | null> {
  const db = await getDB();
  const enc = db.googleDrive?.refreshTokenEnc;
  if (!enc) return null;
  const refresh = await decryptSecret(enc);
  if (!refresh) return null;
  return googleRefreshAccessToken(refresh);
}

function toEntry(f: {
  id: string; name: string; mimeType: string; size?: string; modifiedTime?: string; webViewLink?: string;
}): DriveEntry {
  const isFolder = f.mimeType === "application/vnd.google-apps.folder";
  return {
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    isFolder,
    size: f.size ? Number(f.size) : undefined,
    modifiedTime: f.modifiedTime,
    webViewLink: f.webViewLink,
  };
}

/** Lista el contenido de una carpeta (por defecto la raíz del Drive central). */
export async function driveList(accessToken: string, folderId = "root"): Promise<DriveEntry[]> {
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id,name,mimeType,size,modifiedTime,webViewLink)",
    pageSize: "200",
    orderBy: "folder,name",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
  });
  const res = await fetch(`${FILES_URL}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Drive list ${res.status}`);
  const data = (await res.json()) as { files?: Parameters<typeof toEntry>[0][] };
  return (data.files ?? []).map(toEntry);
}

/** Crea una carpeta dentro de `parentId`. */
export async function driveCreateFolder(accessToken: string, name: string, parentId = "root"): Promise<DriveEntry> {
  return driveCreateNative(accessToken, name, "application/vnd.google-apps.folder", parentId);
}

/** Tipo de documento nativo de Google que se puede crear en blanco. */
export type GoogleDocKind = "document" | "spreadsheet";

/** Crea un Google Doc u Hoja de cálculo en blanco dentro de `parentId`. Solo
 *  requiere el scope de Drive (no las APIs de Docs/Sheets), ya que se crea el
 *  archivo; editar su contenido programáticamente sería otro paso. */
export async function driveCreateGoogleFile(accessToken: string, name: string, kind: GoogleDocKind, parentId = "root"): Promise<DriveEntry> {
  const mimeType = kind === "spreadsheet"
    ? "application/vnd.google-apps.spreadsheet"
    : "application/vnd.google-apps.document";
  return driveCreateNative(accessToken, name, mimeType, parentId);
}

/** Crea un archivo nativo de Google (carpeta/doc/hoja) por metadatos. */
async function driveCreateNative(accessToken: string, name: string, mimeType: string, parentId: string): Promise<DriveEntry> {
  const res = await fetch(`${FILES_URL}?fields=id,name,mimeType,modifiedTime,webViewLink&supportsAllDrives=true`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name, mimeType, parents: [parentId] }),
  });
  if (!res.ok) throw new Error(`Drive create ${res.status}`);
  return toEntry(await res.json());
}

/** Sube un archivo (multipart) a `parentId`. */
export async function driveUpload(
  accessToken: string,
  name: string,
  mimeType: string,
  bytes: Uint8Array,
  parentId = "root",
): Promise<DriveEntry> {
  const boundary = `cobalto-${crypto.randomUUID()}`;
  const meta = JSON.stringify({ name, parents: [parentId] });
  const enc = new TextEncoder();
  const head = enc.encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n` +
    `--${boundary}\r\nContent-Type: ${mimeType || "application/octet-stream"}\r\n\r\n`,
  );
  const tail = enc.encode(`\r\n--${boundary}--`);
  const body = new Uint8Array(head.length + bytes.length + tail.length);
  body.set(head, 0);
  body.set(bytes, head.length);
  body.set(tail, head.length + bytes.length);

  const res = await fetch(`${UPLOAD_URL}?uploadType=multipart&fields=id,name,mimeType,size,modifiedTime,webViewLink&supportsAllDrives=true`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": `multipart/related; boundary=${boundary}` },
    body,
  });
  if (!res.ok) throw new Error(`Drive upload ${res.status}`);
  return toEntry(await res.json());
}

/** Metadatos de un archivo. */
export async function driveFileMeta(accessToken: string, id: string): Promise<DriveEntry | null> {
  const params = new URLSearchParams({
    fields: "id,name,mimeType,size,modifiedTime,webViewLink",
    supportsAllDrives: "true",
  });
  const res = await fetch(`${FILES_URL}/${encodeURIComponent(id)}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  return toEntry(await res.json());
}

/** Descarga el contenido binario de un archivo (no aplica a documentos nativos
 *  de Google, que se abren con su webViewLink). Devuelve la respuesta cruda. */
export async function driveDownload(accessToken: string, id: string): Promise<Response> {
  return fetch(`${FILES_URL}/${encodeURIComponent(id)}?alt=media&supportsAllDrives=true`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

/** Busca una carpeta hija por nombre exacto dentro de `parentId` (no en papelera). */
export async function driveFindFolder(
  accessToken: string,
  name: string,
  parentId = "root",
): Promise<DriveEntry | null> {
  const q = `name = '${name.replace(/'/g, "\\'")}' and '${parentId}' in parents ` +
    `and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const params = new URLSearchParams({
    q,
    fields: "files(id,name,mimeType,modifiedTime,webViewLink)",
    pageSize: "1",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
  });
  const res = await fetch(`${FILES_URL}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Drive find ${res.status}`);
  const data = (await res.json()) as { files?: Parameters<typeof toEntry>[0][] };
  const f = (data.files ?? [])[0];
  return f ? toEntry(f) : null;
}

/**
 * Resuelve el id de la carpeta de trabajo única (PROYECTOS_COBALTO) en el Drive
 * central. Usa el id cacheado en la base si sigue siendo válido; si no, la busca
 * por nombre bajo la raíz. Solo la CREA si `create` es true (acción de admin).
 * Devuelve null si no existe y no se pidió crearla.
 */
export async function driveWorkspaceFolderId(
  accessToken: string,
  opts: { create?: boolean } = {},
): Promise<string | null> {
  const db = await getDB();
  const cached = db.googleDrive?.workspaceFolderId;
  if (cached) {
    // Verifica que el id cacheado siga existiendo (y no esté en papelera).
    const meta = await driveFileMeta(accessToken, cached);
    if (meta && meta.isFolder) return cached;
  }
  let folder = await driveFindFolder(accessToken, WORKSPACE_FOLDER_NAME, "root");
  if (!folder && opts.create) {
    folder = await driveCreateFolder(accessToken, WORKSPACE_FOLDER_NAME, "root");
  }
  if (!folder) return null;
  const id = folder.id;
  if (id !== cached) {
    await mutate((d) => {
      if (d.googleDrive) d.googleDrive.workspaceFolderId = id;
    });
  }
  return id;
}

/** Mueve un archivo/carpeta a la papelera de Drive (recuperable). */
export async function driveTrash(accessToken: string, id: string): Promise<boolean> {
  const res = await fetch(
    `${FILES_URL}/${encodeURIComponent(id)}?supportsAllDrives=true&fields=id`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ trashed: true }),
    },
  );
  return res.ok;
}
