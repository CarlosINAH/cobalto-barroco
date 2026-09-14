import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { listAccess, setAccess } from "@/lib/access";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }
  return NextResponse.json({ access: await listAccess() });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }
  let b: { username?: string; estado?: string };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const username = (b.username || "").trim();
  const estado =
    b.estado === "aprobado" || b.estado === "rechazado" ? b.estado : null;
  if (!username || !estado) {
    return NextResponse.json(
      { error: "Faltan datos (usuario o estado)." },
      { status: 400 },
    );
  }
  const entry = await setAccess(username, estado, session.username);
  return NextResponse.json({ ok: true, entry });
}
