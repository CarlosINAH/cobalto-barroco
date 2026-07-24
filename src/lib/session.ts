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
