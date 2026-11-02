import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { driveAccessToken, driveFileMeta, driveDownload } from "@/lib/drive";

export const runtime = "nodejs";

/**
 * Descarga/abre un archivo del Drive central (solo admin). Los documentos
 * nativos de Google (Docs/Sheets/Slides) no tienen binario: se redirige a su
 * enlace para abrirlos en Google. El resto se transmite por el servidor para
 * no exponer el token.
 */
export async function GET(req: Request) {
  const s = await getSession();
  if (!s || s.role !== "admin")
    return new Response("No autorizado.", { status: 403 });
  const token = await driveAccessToken();
  if (!token) return new Response("Drive no conectado.", { status: 409 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return new Response("Falta el id.", { status: 400 });

  const meta = await driveFileMeta(token, id);
  if (!meta) return new Response("No encontrado.", { status: 404 });

  // Documentos nativos de Google: abrir en Drive (no se pueden descargar crudo).
  if (meta.mimeType.startsWith("application/vnd.google-apps")) {
    if (meta.webViewLink) return NextResponse.redirect(meta.webViewLink);
    return new Response("Este documento se abre en Google Drive.", { status: 409 });
  }

  const res = await driveDownload(token, id);
  if (!res.ok || !res.body) return new Response("No se pudo descargar.", { status: 502 });
  const nombre = meta.name.replace(/[\r\n"]/g, "_");
  return new Response(res.body, {
    headers: {
      "Content-Type": meta.mimeType || "application/octet-stream",
      "Content-Disposition": `inline; filename="${nombre}"`,
      "Cache-Control": "no-store",
    },
  });
}
