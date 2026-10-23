import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, readSessionToken, type Session } from "@/lib/session";
import { isShared } from "@/lib/shared-files";

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

/**
 * Credenciales de la "cuenta de servicio" del área compartida (si están
 * configuradas). Es una cuenta del NAS con acceso a `Archivos compartidos`,
 * de modo que TODOS los empleados puedan usar lo compartido sin que el admin
 * configure el NAS por persona: los permisos de quién ve/edita qué los decide
 * la plataforma (modelo de carpetas), no el NAS.
 *
 * Si no está configurada (variables de entorno ausentes), devuelve null y todo
 * sigue usando la credencial personal de cada usuario (comportamiento previo).
 */
export function sharedCreds(): { username: string; password: string } | null {
  const username = process.env.SHARED_WEBDAV_USER;
  const password = process.env.SHARED_WEBDAV_PASSWORD;
  if (!username || !password) return null;
  return { username, password };
}

/**
 * Credenciales con las que la app debe entrar al NAS para una ruta dada:
 * - rutas dentro de `Archivos compartidos` → cuenta de servicio (si existe);
 * - cualquier otra (Nube personal de cada quien) → su credencial personal.
 */
export function credsForPath(
  session: Session,
  path: string,
): { username: string; password: string } {
  if (isShared(path)) {
    const svc = sharedCreds();
    if (svc) return svc;
  }
  return credsOf(session);
}
