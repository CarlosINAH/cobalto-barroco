import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, readSessionToken, type Session } from "@/lib/session";

/**
 * Devuelve la sesión del usuario actual (con su credencial descifrada para
 * acceder al NAS), o null si no hay sesión válida. Uso en Server Components
 * y route handlers (runtime Node).
 */
export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return readSessionToken(token);
}

/** Exige sesión; si no la hay, redirige al login. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/** Exige rol admin; si no, redirige. */
export async function requireAdmin(): Promise<Session> {
  const session = await requireSession();
  if (session.role !== "admin") redirect("/dashboard/empleado");
  return session;
}

/** Credenciales para el cliente WebDAV a partir de la sesión. */
export function credsOf(session: Session): {
  username: string;
  password: string;
} {
  return { username: session.username, password: session.pw };
}
