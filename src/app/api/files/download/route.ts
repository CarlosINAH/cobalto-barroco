import { NextResponse } from "next/server";
import { getSession, credsOf } from "@/lib/auth-server";
import { downloadFile } from "@/lib/webdav";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const relPath = searchParams.get("path") || "";
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
  return new Response(res.body, {
    headers: {
      "Content-Type": res.headers.get("content-type") || "application/octet-stream",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
    },
  });
}
