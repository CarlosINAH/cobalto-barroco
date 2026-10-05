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
  heif: "image/heif",
  // documentos que el navegador puede previsualizar inline
  pdf: "application/pdf",
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

  // Reenviamos el Range solo en vista inline, para que el navegador pueda
  // hacer seek en videos (respuestas 206 Partial Content).
  const range = req.headers.get("range");

  let res: Response;
  try {
    res = await downloadFile(credsOf(session), relPath, inline ? range : null);
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

  const headers = new Headers({
    "Content-Type": contentType,
    "Content-Disposition": disposition,
  });

  // Reenvío de cabeceras de rango para que el navegador pueda hacer seek en video.
  const acceptRanges = res.headers.get("accept-ranges");
  const contentRange = res.headers.get("content-range");
  const contentLength = res.headers.get("content-length");
  if (acceptRanges) headers.set("Accept-Ranges", acceptRanges);
  if (contentRange) headers.set("Content-Range", contentRange);
  if (contentLength) headers.set("Content-Length", contentLength);

  // 206 si el NAS respondió parcial; si no, 200.
  return new Response(res.body, {
    status: res.status === 206 ? 206 : 200,
    headers,
  });
}
