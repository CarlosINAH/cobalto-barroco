import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { googleConfigured } from "@/lib/google";
import {
  driveConnected,
  driveAccountEmail,
  driveAccessToken,
  driveWorkspaceFolderId,
  WORKSPACE_FOLDER_NAME,
} from "@/lib/drive";
import { drivePermsForSession } from "@/lib/drive-perms";

export const runtime = "nodejs";

/**
 * Punto de entrada del área de Archivos (Drive): devuelve el id de la carpeta de
 * trabajo única (PROYECTOS_COBALTO) y los permisos del usuario actual. Cualquier
 * usuario con sesión puede consultarla; solo el admin la crea si aún no existe.
 */
export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  const enabled = googleConfigured();
  const connected = await driveConnected();
  const caps = await drivePermsForSession(s);

  let folderId: string | null = null;
  if (connected) {
    const token = await driveAccessToken();
    if (token) {
      folderId = await driveWorkspaceFolderId(token, {
        create: s.role === "admin",
      }).catch(() => null);
    }
  }

  return NextResponse.json({
    enabled,
    connected,
    email: await driveAccountEmail(),
    folderId,
    folderName: WORKSPACE_FOLDER_NAME,
    caps,
    isAdmin: s.role === "admin",
  });
}
