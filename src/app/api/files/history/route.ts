import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { getMeta } from "@/lib/shared-files";

export const runtime = "nodejs";

/** Historial y metadatos de un archivo compartido. */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path") || "";
  if (!path) {
    return NextResponse.json({ error: "Ruta inválida." }, { status: 400 });
  }
  const meta = await getMeta(path);
  return NextResponse.json({ meta });
}
