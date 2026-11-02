import { EncryptJWT, jwtDecrypt } from "jose";

export type Role = "admin" | "empleado";

export interface Session {
  /** Nombre de usuario en el NAS. */
  username: string;
  role: Role;
  /**
   * Contraseña del NAS del usuario. Se guarda CIFRADA dentro de la cookie
   * (JWE / AES-256-GCM) para poder acceder a sus archivos "como él mismo",
   * de modo que el propio NAS imponga qué puede ver. Nunca sale del servidor
   * en claro ni se persiste fuera de la cookie httpOnly.
   */
  pw: string;
}

/** Nombre de la cookie de sesión. */
export const SESSION_COOKIE = "cb_session";

/** Duración de la sesión, en segundos (12 horas). */
export const SESSION_MAX_AGE = 60 * 60 * 12;

let cachedKey: Uint8Array | null = null;

/** Deriva una clave simétrica de 32 bytes a partir de SESSION_SECRET. */
async function getKey(): Promise<Uint8Array> {
  if (cachedKey) return cachedKey;
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET no está configurado");
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(s),
  );
  cachedKey = new Uint8Array(digest);
  return cachedKey;
}

/** Lista de administradores (usuarios del NAS separados por comas). */
export function isAdmin(username: string): boolean {
  const admins = (process.env.ADMIN_USERS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(username.trim().toLowerCase());
}

/** Crea el token de sesión cifrado (JWE, AES-256-GCM). */
export async function createSessionToken(session: Session): Promise<string> {
  const key = await getKey();
  return await new EncryptJWT({
    username: session.username,
    role: session.role,
    pw: session.pw,
  })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .encrypt(key);
}

/**
 * Sella un objeto pequeño (JWE, AES-256-GCM, vigencia 10 min) para usarlo como
 * parámetro `state` del flujo OAuth de Google: va cifrado y firmado con la clave
 * de sesión, así no se puede falsificar ni manipular (intención, usuario a
 * vincular, nonce). Caduca solo.
 */
export async function sealOAuthState(data: Record<string, unknown>): Promise<string> {
  const key = await getKey();
  return await new EncryptJWT(data)
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .encrypt(key);
}

/** Abre y valida un `state` sellado con `sealOAuthState`; null si es inválido o caducó. */
export async function openOAuthState(token: string): Promise<Record<string, unknown> | null> {
  try {
    const key = await getKey();
    const { payload } = await jwtDecrypt(token, key);
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Cifra un secreto para guardarlo en reposo (sin caducidad), p. ej. el refresh
 * token del Drive central. Usa la misma clave de sesión (AES-256-GCM). Solo el
 * servidor puede descifrarlo con `decryptSecret`.
 */
export async function encryptSecret(value: string): Promise<string> {
  const key = await getKey();
  return await new EncryptJWT({ v: value })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .encrypt(key);
}

/** Descifra un secreto sellado con `encryptSecret`; null si es inválido. */
export async function decryptSecret(token: string): Promise<string | null> {
  try {
    const key = await getKey();
    const { payload } = await jwtDecrypt(token, key);
    return typeof payload.v === "string" ? payload.v : null;
  } catch {
    return null;
  }
}

/** Descifra y valida el token; devuelve la sesión o null. */
export async function readSessionToken(
  token: string,
): Promise<Session | null> {
  try {
    const key = await getKey();
    const { payload } = await jwtDecrypt(token, key);
    if (!payload.username || typeof payload.pw !== "string") return null;
    return {
      username: String(payload.username),
      role: payload.role === "admin" ? "admin" : "empleado",
      pw: payload.pw,
    };
  } catch {
    return null;
  }
}
