import { NextResponse } from "next/server";
import { getSession, credsOf } from "@/lib/auth-server";
import { isShared, canWriteSharedPath } from "@/lib/shared-files";
import { trashItem } from "@/lib/trash";

export const runtime = "nodejs";

/**
 * "Eliminar" = enviar a la papelera de reciclaje (no borra del NAS). Los
 * empleados pueden mandar a la papelera lo que pueden escribir; en el área
 * compartida se exige permiso de escritura. Vaciar la papelera (borrado
 * definitivo) es solo para administradores (ver /api/files/trash).
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  let body: { path?: string; isDir?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  if (!body.path) {
    return NextResponse.json({ error: "Ruta inválida." }, { status: 400 });
  }

  // En el área compartida, enviar a la papelera requiere escritura.
  if (
    isShared(body.path) &&
    !(await canWriteSharedPath(session.username, session.role, body.path))
  ) {
    return NextResponse.json(
      { error: "No tienes permiso para eliminar en esta carpeta." },
      { status: 403 },
    );
  }

  const res = await trashItem(
    credsOf(session),
    session.username,
    body.path,
    !!body.isDir,
  );
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: 403 });
  }
  return NextResponse.json({ ok: true });
}
