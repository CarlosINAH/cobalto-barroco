import { NextResponse } from "next/server";
import { getSession, credsForPath } from "@/lib/auth-server";
import { isShared, canAccessNasPath, projectIdForPath } from "@/lib/shared-files";
import { trashItem } from "@/lib/trash";
import { canDoFileAction } from "@/lib/access";
import { registrarMovimiento } from "@/lib/bitacora";

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

  // Autorización global de acción (matriz del Excel): ¿puede borrar?
  if (!(await canDoFileAction(session.username, session.role, "borrar"))) {
    return NextResponse.json(
      { error: "No tienes permiso para eliminar archivos." },
      { status: 403 },
    );
  }

  // Acceso: el empleado solo elimina dentro del "compartido" de sus proyectos.
  if (!(await canAccessNasPath(session, body.path))) {
    return NextResponse.json(
      { error: "No tienes permiso para eliminar en esta carpeta." },
      { status: 403 },
    );
  }

  const res = await trashItem(
    credsForPath(session, body.path),
    session.username,
    body.path,
    !!body.isDir,
  );
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: 403 });
  }

  // Bitácora: registra el envío a la papelera (best-effort).
  if (isShared(body.path)) {
    const projectId = await projectIdForPath(body.path);
    const nombre = body.path.split("/").filter(Boolean).pop() || "un elemento";
    await registrarMovimiento(session, {
      accion: "eliminó",
      entidad: body.isDir ? "carpeta" : "archivo",
      descripcion: `Envió a la papelera "${nombre}"`,
      projectId,
    });
  }

  return NextResponse.json({ ok: true });
}
