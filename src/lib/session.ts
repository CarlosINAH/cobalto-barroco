import { SignJWT, jwtVerify } from "jose";

export type Role = "admin" | "empleado";

export interface Session {
  username: string;
  role: Role;
}

/** Nombre de la cookie de sesión. */
export const SESSION_COOKIE = "cb_session";

/** Duración de la sesión, en segundos (12 horas). */
export const SESSION_MAX_AGE = 60 * 60 * 12;

function secret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET no está configurado");
  return new TextEncoder().encode(s);
}

/**
 * Determina si un usuario es administrador según la lista ADMIN_USERS
 * (nombres de usuario del NAS separados por comas).
 */
export function isAdmin(username: string): boolean {
  const admins = (process.env.ADMIN_USERS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(username.trim().toLowerCase());
}

/** Firma un token de sesión (JWT HS256) con el usuario y su rol. */
export async function createSessionToken(session: Session): Promise<string> {
  return await new SignJWT({ role: session.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.username)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secret());
}

/** Verifica un token de sesión; devuelve la sesión o null si es inválido. */
export async function verifySessionToken(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;
    return {
      username: String(payload.sub),
      role: payload.role === "admin" ? "admin" : "empleado",
    };
  } catch {
    return null;
  }
}
