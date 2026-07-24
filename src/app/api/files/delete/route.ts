import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { removeEntry } from "@/lib/files";

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
  try {
    await removeEntry(session, body.path || "");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "No se pudo eliminar." },
      { status: 403 },
    );
  }
}
