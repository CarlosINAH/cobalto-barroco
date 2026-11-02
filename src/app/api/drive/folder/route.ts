import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { driveAccessToken, driveCreateFolder } from "@/lib/drive";

export const runtime = "nodejs";

/** Crea una carpeta en el Drive central (solo admin). */
export async function POST(req: Request) {
  const s = await getSession();
  if (!s || s.role !== "admin")
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const token = await driveAccessToken();
  if (!token)
    return NextResponse.json({ error: "Drive no conectado." }, { status: 409 });
  let b: { name?: string; parentId?: string };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const name = (b.name || "").trim();
  if (!name) return NextResponse.json({ error: "Falta el nombre." }, { status: 400 });
  try {
    const entry = await driveCreateFolder(token, name, b.parentId || "root");
    return NextResponse.json({ entry });
  } catch {
    return NextResponse.json({ error: "No se pudo crear la carpeta." }, { status: 502 });
  }
}
