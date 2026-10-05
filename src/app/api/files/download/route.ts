import { NextResponse } from "next/server";
import { getSession, credsOf } from "@/lib/auth-server";
import { downloadFile } from "@/lib/webdav";

export const runtime = "nodejs";

/** Tipo MIME por extensión (para previsualizar imágenes/videos correctamente). */
const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  svg: "image/svg+xml",
  avif: "image/avif",
  heic: "image/heic",
  tiff: "image/tiff",
  tif: "image/tiff",
  mp4: "video/mp4",
  m4v: "video/x-m4v",
  webm: "video/webm",
  ogv: "video/ogg",
  ogg: "video/ogg",
  mov: "video/quicktime",
  avi: "video/x-msvideo",
  mkv: "video/x-matroska",
  "3gp": "video/3gpp",
};

function mimeFor(name: string): string | null {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return MIME[ext] || null;
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const relPath = searchParams.get("path") || "";
  const inline = searchParams.get("inline") === "1";
  if (!relPath) {
    return NextResponse.json({ error: "Ruta inválida." }, { status: 400 });
  }

  let res: Response;
  try {
    res = await downloadFile(credsOf(session), relPath);
  } catch {
    return NextResponse.json({ error: "El NAS no respondió." }, { status: 502 });
  }
  if (!res.ok || !res.body) {
    return NextResponse.json(
      { error: "Archivo no encontrado o sin acceso." },
      { status: res.status === 401 || res.status === 403 ? 403 : 404 },
    );
  }

  const name = relPath.split("/").filter(Boolean).pop() || "archivo";
  // Para previsualizar: tipo por extensión (más fiable que el del NAS) e inline.
  const byExt = mimeFor(name);
  const contentType = inline
    ? byExt || res.headers.get("content-type") || "application/octet-stream"
    : res.headers.get("content-type") || "application/octet-stream";
  const disposition = inline
    ? `inline; filename*=UTF-8''${encodeURIComponent(name)}`
    : `attachment; filename*=UTF-8''${encodeURIComponent(name)}`;

  return new Response(res.body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": disposition,
    },
  });
}
