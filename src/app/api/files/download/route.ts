import { NextResponse } from "next/server";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { getSession } from "@/lib/auth-server";
import { resolveForDownload } from "@/lib/files";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const relPath = searchParams.get("path") || "";

  let info: { abs: string; name: string; size: number };
  try {
    info = await resolveForDownload(session, relPath);
  } catch {
    return NextResponse.json(
      { error: "Archivo no encontrado o sin acceso." },
      { status: 404 },
    );
  }

  const nodeStream = createReadStream(info.abs);
  const webStream = Readable.toWeb(nodeStream) as ReadableStream;

  return new Response(webStream, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(info.size),
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(info.name)}`,
    },
  });
}
