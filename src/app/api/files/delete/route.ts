import { NextResponse } from "next/server";
import { getSession, credsOf } from "@/lib/auth-server";
import { deleteEntry } from "@/lib/webdav";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  let body: { path?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  if (!body.path) {
    return NextResponse.json({ error: "Ruta inválida." }, { status: 400 });
  }
  try {
    const ok = await deleteEntry(credsOf(session), body.path);
    if (!ok) throw new Error("delete");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "No se pudo eliminar (¿permiso del NAS?)." },
      { status: 403 },
    );
  }
}
