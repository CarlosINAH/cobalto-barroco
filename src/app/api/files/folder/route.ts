import { NextResponse } from "next/server";
import { getSession, credsOf } from "@/lib/auth-server";
import { makeDirectory } from "@/lib/webdav";
import { isShared, recordFolderCreated, canWriteSharedPath } from "@/lib/shared-files";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  let body: { path?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const name = (body.name || "").trim().replace(/[\\/]/g, "");
  if (!name) {
    return NextResponse.json(
      { error: "Nombre de carpeta inválido." },
      { status: 400 },
    );
  }
  const target = body.path ? `${body.path}/${name}` : name;

  // En el área compartida, crear subcarpetas requiere escritura o acceso total.
  if (
    isShared(target) &&
    !(await canWriteSharedPath(session.username, session.role, body.path || ""))
  ) {
    return NextResponse.json(
      { error: "No tienes permiso de escritura en esta carpeta." },
      { status: 403 },
    );
  }

  try {
    const ok = await makeDirectory(credsOf(session), target);
    if (!ok) throw new Error("mkcol");
    if (isShared(target)) {
      await recordFolderCreated(target, session.username);
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "No se pudo crear la carpeta (¿permiso del NAS?)." },
      { status: 403 },
    );
  }
}
