import { NextResponse } from "next/server";
import { getSession, credsForPath } from "@/lib/auth-server";
import { makeDirectoryDeep } from "@/lib/webdav";
import { isShared, canAccessNasPath, projectIdForPath } from "@/lib/shared-files";
import { canDoFileAction } from "@/lib/access";
import { registrarMovimiento } from "@/lib/bitacora";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  // Crear carpetas es una acción de escritura: se rige por "subir".
  if (!(await canDoFileAction(session.username, session.role, "subir"))) {
    return NextResponse.json(
      { error: "No tienes permiso para crear carpetas." },
      { status: 403 },
    );
  }
  let body: { path?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  // Admite nombres anidados ("A/B/C"): se crea cada nivel. Se saneja cada
  // segmento y se descartan vacíos y "." / "..".
  const name = (body.name || "")
    .trim()
    .replace(/\\/g, "/")
    .split("/")
    .map((s) => s.trim())
    .filter((s) => s && s !== "." && s !== "..")
    .join("/");
  if (!name) {
    return NextResponse.json(
      { error: "Nombre de carpeta inválido." },
      { status: 400 },
    );
  }
  const target = body.path ? `${body.path}/${name}` : name;

  // Acceso: el empleado solo crea carpetas dentro del "compartido" de sus
  // proyectos asignados; el admin, en cualquier parte.
  if (!(await canAccessNasPath(session, body.path || ""))) {
    return NextResponse.json(
      { error: "No tienes permiso de escritura en esta carpeta." },
      { status: 403 },
    );
  }

  try {
    const ok = await makeDirectoryDeep(credsForPath(session, target), target);
    if (!ok) throw new Error("mkcol");
    // Bitácora: registra la carpeta creada (best-effort).
    if (isShared(target)) {
      const projectId = await projectIdForPath(target);
      await registrarMovimiento(session, {
        accion: "creó",
        entidad: "carpeta",
        descripcion: `Creó la carpeta "${name}"`,
        projectId,
      });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "No se pudo crear la carpeta (¿permiso del NAS?)." },
      { status: 403 },
    );
  }
}
