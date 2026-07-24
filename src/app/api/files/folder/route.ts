import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { makeDir } from "@/lib/files";

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
  try {
    await makeDir(session, `${body.path || ""}/${name}`);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "No se pudo crear la carpeta." },
      { status: 403 },
    );
  }
}
