import { NextResponse } from "next/server";
import { getSession, credsOf } from "@/lib/auth-server";
import { listDirectory, type WebDavEntry } from "@/lib/webdav";
import {
  isShared,
  isSharedRoot,
  sharedTopSubfolder,
  visibleSharedFolders,
  metaForPaths,
} from "@/lib/shared-files";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const relPath = searchParams.get("path") || "";

  // Visibilidad de carpetas por empleado (capa del app sobre el NAS).
  if (isShared(relPath) && session.role !== "admin") {
    const allowed = await visibleSharedFolders(session.username);
    if (allowed !== null) {
      const top = sharedTopSubfolder(relPath);
      if (top && !allowed.includes(top)) {
        return NextResponse.json(
          { error: "No tienes acceso a esa carpeta." },
          { status: 403 },
        );
      }
    }
  }

  try {
    let entries = await listDirectory(credsOf(session), relPath);
    // En la raíz compartida, un empleado solo ve las subcarpetas permitidas.
    if (isSharedRoot(relPath) && session.role !== "admin") {
      const allowed = await visibleSharedFolders(session.username);
      if (allowed !== null) {
        entries = entries.filter((e) => !e.isDir || allowed.includes(e.name));
      }
    }
    // En el área compartida, adjuntamos autor/fecha de subida desde nuestra DB.
    const meta = isShared(relPath)
      ? await metaForPaths(entries.filter((e: WebDavEntry) => !e.isDir).map((e: WebDavEntry) => e.path))
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
