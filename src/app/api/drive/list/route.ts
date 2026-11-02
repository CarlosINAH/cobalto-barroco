import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { driveAccessToken, driveList } from "@/lib/drive";

export const runtime = "nodejs";

/** Lista una carpeta del Drive central (solo admin). */
export async function GET(req: Request) {
  const s = await getSession();
  if (!s || s.role !== "admin")
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const token = await driveAccessToken();
  if (!token)
    return NextResponse.json({ error: "Drive no conectado." }, { status: 409 });
  const folderId = new URL(req.url).searchParams.get("folderId") || "root";
  try {
    const entries = await driveList(token, folderId);
    return NextResponse.json({ entries });
  } catch {
    return NextResponse.json({ error: "No se pudo listar el Drive." }, { status: 502 });
  }
}
