import { NextResponse } from "next/server";
import { getSession, credsOf } from "@/lib/auth-server";
import { makeDirectory } from "@/lib/webdav";

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
  try {
    const ok = await makeDirectory(credsOf(session), target);
    if (!ok) throw new Error("mkcol");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "No se pudo crear la carpeta (¿permiso del NAS?)." },
      { status: 403 },
    );
  }
}
