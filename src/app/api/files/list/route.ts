import { NextResponse } from "next/server";
import { getSession, credsForPath } from "@/lib/auth-server";
import { listDirectory, type WebDavEntry } from "@/lib/webdav";
import { isShared, metaForPaths, canAccessNasPath } from "@/lib/shared-files";
import { canDoFileAction } from "@/lib/access";
import { isInTrash } from "@/lib/trash";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const relPath = searchParams.get("path") || "";
  const inShared = isShared(relPath);

  // La papelera no se navega desde el explorador (tiene su propia pestaña).
  if (isInTrash(relPath)) {
    return NextResponse.json({ error: "No disponible." }, { status: 403 });
  }

  // Acceso: el admin ve todo; un empleado solo dentro del "compartido" de sus
  // proyectos asignados. El acceso a un proyecto se decide por asignación.
  if (!(await canAccessNasPath(session, relPath))) {
    return NextResponse.json(
      { error: "No tienes acceso a esa carpeta." },
      { status: 403 },
    );
  }

  try {
    let entries = await listDirectory(credsForPath(session, relPath), relPath);

    // La carpeta de papelera no se muestra en el explorador compartido.
    if (inShared) entries = entries.filter((e) => !isInTrash(e.path));

    // Metadatos de archivos (autor/fecha) desde nuestra DB.
    const meta = inShared
      ? await metaForPaths(
          entries.filter((e: WebDavEntry) => !e.isDir).map((e: WebDavEntry) => e.path),
        )
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

    // ¿Puede subir/crear en la carpeta actual? (matriz global de acciones).
    const canWrite = await canDoFileAction(session.username, session.role, "subir");

    return NextResponse.json({
      path: relPath,
      entries: mapped,
      role: session.role,
      canWrite,
    });
  } catch {
    return NextResponse.json(
      { error: "No tienes acceso a esa carpeta o el NAS no respondió." },
      { status: 403 },
    );
  }
}
