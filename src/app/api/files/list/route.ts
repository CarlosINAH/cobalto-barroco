import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { listDir } from "@/lib/files";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const relPath = searchParams.get("path") || "";
  try {
    const entries = await listDir(session, relPath);
    return NextResponse.json({ path: relPath, entries, role: session.role });
  } catch {
    return NextResponse.json(
      { error: "No tienes acceso a esa carpeta." },
      { status: 403 },
    );
  }
}
