import "server-only";
import { getDB } from "@/lib/db";
import { decryptSecret } from "@/lib/session";
import { googleRefreshAccessToken } from "@/lib/google";

/**
 * Acceso a la cuenta central de Google de la empresa. La conexión (refresh
 * token cifrado) se guarda en la base de datos; aquí se resuelve un access
 * token fresco. Lo usa el Calendario para crear eventos e invitar por correo.
 * (El explorador de Google Drive se retiró; los archivos viven en el NAS.)
 */

/** ¿Hay una cuenta central de Google conectada? */
export async function driveConnected(): Promise<boolean> {
  const db = await getDB();
  return !!db.googleDrive?.refreshTokenEnc;
}

/** Correo de la cuenta central conectada (si hay). */
export async function driveAccountEmail(): Promise<string | null> {
  const db = await getDB();
  return db.googleDrive?.email ?? null;
}

/** Access token fresco de la cuenta central, o null si no está conectada/falla. */
export async function driveAccessToken(): Promise<string | null> {
  const db = await getDB();
  const enc = db.googleDrive?.refreshTokenEnc;
  if (!enc) return null;
  const refresh = await decryptSecret(enc);
  if (!refresh) return null;
  return googleRefreshAccessToken(refresh);
}
