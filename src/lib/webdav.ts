/**
 * Cliente WebDAV mínimo contra el NAS UGREEN.
 *
 * Todas las operaciones usan las credenciales del usuario autenticado, así que
 * el propio NAS decide qué carpetas/archivos puede ver o tocar: el aislamiento
 * entre empleados lo garantiza el NAS, no la app.
 */

export interface WebDavEntry {
  name: string;
  path: string; // ruta relativa a la raíz WebDAV
  isDir: boolean;
  size: number;
  modified: string | null;
}

function baseUrl(): string {
  const url = process.env.WEBDAV_URL;
  if (!url) throw new Error("WEBDAV_URL no está configurado");
  return url.replace(/\/+$/, "");
}

function authHeader(username: string, password: string): string {
  return "Basic " + Buffer.from(`${username}:${password}`).toString("base64");
}

/** Normaliza y evita salir de la raíz (../). */
function safePath(p: string): string {
  const parts = (p || "")
    .split("/")
    .filter((seg) => seg && seg !== "." && seg !== "..");
  return parts.join("/");
}

function encodePath(p: string): string {
  return safePath(p)
    .split("/")
    .map(encodeURIComponent)
    .join("/");
}

interface Credentials {
  username: string;
  password: string;
}

/** Verifica credenciales contra el NAS (PROPFIND en la raíz). */
export async function checkCredentials(
  creds: Credentials,
): Promise<boolean> {
  try {
    const res = await fetch(baseUrl() + "/", {
      method: "PROPFIND",
      headers: {
        Authorization: authHeader(creds.username, creds.password),
        Depth: "0",
      },
      signal: AbortSignal.timeout(8000),
    });
    return res.status === 207 || res.status === 200;
  } catch {
    return false;
  }
}

/** Lista el contenido de una carpeta. Lanza si el NAS deniega el acceso. */
export async function listDirectory(
  creds: Credentials,
  dir: string,
): Promise<WebDavEntry[]> {
  const rel = safePath(dir);
  const url = baseUrl() + "/" + encodePath(dir) + (rel ? "/" : "");
  const res = await fetch(url, {
    method: "PROPFIND",
    headers: {
      Authorization: authHeader(creds.username, creds.password),
      Depth: "1",
      "Content-Type": "application/xml",
    },
    signal: AbortSignal.timeout(15000),
  });
  if (res.status === 401 || res.status === 403) {
    throw new Error("forbidden");
  }
  if (res.status !== 207) {
    throw new Error(`webdav_error_${res.status}`);
  }
  const xml = await res.text();
  return parsePropfind(xml, rel);
}

/** Descarga un archivo como stream/respuesta. */
export async function downloadFile(
  creds: Credentials,
  filePath: string,
): Promise<Response> {
  const url = baseUrl() + "/" + encodePath(filePath);
  return fetch(url, {
    headers: { Authorization: authHeader(creds.username, creds.password) },
    signal: AbortSignal.timeout(60000),
  });
}

/** Sube (crea/sobrescribe) un archivo. */
export async function uploadFile(
  creds: Credentials,
  filePath: string,
  body: ArrayBuffer | Uint8Array,
): Promise<boolean> {
  const url = baseUrl() + "/" + encodePath(filePath);
  const res = await fetch(url, {
    method: "PUT",
    headers: { Authorization: authHeader(creds.username, creds.password) },
    body: body as BodyInit,
    signal: AbortSignal.timeout(120000),
  });
  return res.ok;
}

/** Crea una carpeta (MKCOL). */
export async function makeDirectory(
  creds: Credentials,
  dir: string,
): Promise<boolean> {
  const url = baseUrl() + "/" + encodePath(dir) + "/";
  const res = await fetch(url, {
    method: "MKCOL",
    headers: { Authorization: authHeader(creds.username, creds.password) },
    signal: AbortSignal.timeout(15000),
  });
  return res.ok || res.status === 405; // 405 = ya existe
}

/** Borra un archivo o carpeta. */
export async function deleteEntry(
  creds: Credentials,
  target: string,
): Promise<boolean> {
  const url = baseUrl() + "/" + encodePath(target);
  const res = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: authHeader(creds.username, creds.password) },
    signal: AbortSignal.timeout(30000),
  });
  return res.ok;
}

/** Parsea la respuesta XML multi-status de PROPFIND (sin dependencias). */
function parsePropfind(xml: string, currentDir: string): WebDavEntry[] {
  const entries: WebDavEntry[] = [];
  // Divide por <response> (con o sin prefijo de namespace: D:, d:, lp1:, etc.).
  // Con Depth:1, la primera entrada es la propia carpeta consultada -> se omite.
  const responses = xml.split(/<[^>]*?:?response[\s>]/i).slice(2);
  for (const chunk of responses) {
    const href = firstTag(chunk, "href");
    if (!href) continue;
    let decoded: string;
    try {
      decoded = decodeURIComponent(href);
    } catch {
      decoded = href;
    }
    const isDir = /<[^>]*?:?collection\b/i.test(chunk);
    const size = parseInt(firstTag(chunk, "getcontentlength") || "0", 10) || 0;
    const modified = firstTag(chunk, "getlastmodified");

    // Nombre = último segmento no vacío del href.
    const name = decoded.replace(/\/+$/, "").split("/").filter(Boolean).pop();
    if (!name) continue;

    entries.push({
      name,
      path: currentDir ? `${currentDir}/${name}` : name,
      isDir,
      size,
      modified: modified || null,
    });
  }
  return entries;
}

function firstTag(chunk: string, tag: string): string | null {
  const re = new RegExp(
    `<[^>]*?:?${tag}[^>]*>([\\s\\S]*?)</[^>]*?:?${tag}>`,
    "i",
  );
  const m = chunk.match(re);
  return m ? m[1].trim() : null;
}
