import { NextResponse } from "next/server";
import { getSession, credsOf } from "@/lib/auth-server";
import { listDirectory } from "@/lib/webdav";
import { isShared, metaForPaths } from "@/lib/shared-files";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const relPath = searchParams.get("path") || "";
  try {
    const entries = await listDirectory(credsOf(session), relPath);
    // En el área compartida, adjuntamos autor/fecha de subida desde nuestra DB.
    const meta = isShared(relPath)
      ? await metaForPaths(entries.filter((e) => !e.isDir).map((e) => e.path))
      : {};
    const mapped = entries.map((e) => {
      const m = meta[e.path];
      return {
        name: e.name,
        path: e.path,
        isDir: e.isDir,
        size: e.size,
        modified: e.modified ? Date.parse(e.modified) || 0 : 0,
        subidoPor: m?.subidoPor ?? null,
        subidoEn: m?.subidoEn ?? null,
      };
    });
    return NextResponse.json({ path: relPath, entries: mapped, role: session.role });
  } catch {
    return NextResponse.json(
      { error: "No tienes acceso a esa carpeta o el NAS no respondió." },
      { status: 403 },
    );
  }
}
