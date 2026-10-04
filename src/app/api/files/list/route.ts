import { NextResponse } from "next/server";
import { getSession, credsOf } from "@/lib/auth-server";
import { listDirectory, type WebDavEntry } from "@/lib/webdav";
import {
  isShared,
  isSharedRoot,
  sharedTopSubfolder,
  visibleSharedFolders,
  metaForPaths,
  allFolderShares,
  canSeeWith,
  canManageWith,
  isRestrictedWith,
  folderMetaWith,
} from "@/lib/shared-files";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const relPath = searchParams.get("path") || "";
  const isEmployee = session.role !== "admin";
  const inShared = isShared(relPath);

  // Cargar comparticiones una sola vez (para filtrar/anotar sin N lecturas).
  const shares = inShared ? await allFolderShares() : [];

  // Acceso a la carpeta solicitada (visibilidad admin + compartición por carpeta).
  if (inShared && isEmployee) {
    const allowed = await visibleSharedFolders(session.username);
    const top = sharedTopSubfolder(relPath);
    const blockedByAdmin = allowed !== null && top !== null && !allowed.includes(top);
    const blockedByShare = !canSeeWith(shares, session.username, session.role, relPath);
    if (blockedByAdmin || blockedByShare) {
      return NextResponse.json(
        { error: "No tienes acceso a esa carpeta." },
        { status: 403 },
      );
    }
  }

  try {
    let entries = await listDirectory(credsOf(session), relPath);

    // Filtrado para empleados: visibilidad admin + compartición por carpeta.
    if (inShared && isEmployee) {
      const allowed = isSharedRoot(relPath)
        ? await visibleSharedFolders(session.username)
        : null;
      entries = entries.filter((e) => {
        if (!e.isDir) return true;
        if (allowed !== null && !allowed.includes(e.name)) return false; // regla admin
        return canSeeWith(shares, session.username, session.role, e.path); // compartición
      });
    }

    // Metadatos de archivos (autor/fecha) desde nuestra DB.
    const meta = inShared
      ? await metaForPaths(
          entries.filter((e: WebDavEntry) => !e.isDir).map((e: WebDavEntry) => e.path),
        )
      : {};

    const mapped = entries.map((e) => {
      const m = meta[e.path];
      // Para carpetas compartidas, el autor/fecha vienen del registro de share.
      const fm = inShared && e.isDir ? folderMetaWith(shares, e.path) : null;
      return {
        name: e.name,
        path: e.path,
        isDir: e.isDir,
        size: e.size,
        modified: e.modified ? Date.parse(e.modified) || 0 : 0,
        subidoPor: m?.subidoPor ?? fm?.sharedBy ?? null,
        subidoEn: m?.subidoEn ?? fm?.createdAt ?? null,
        // Sharing (solo carpetas en el área compartida).
        restricted: inShared && e.isDir ? isRestrictedWith(shares, e.path) : false,
        canManage:
          inShared && e.isDir
            ? canManageWith(shares, session.username, session.role, e.path)
            : false,
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
