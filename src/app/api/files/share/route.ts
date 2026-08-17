import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import {
  isShared,
  canSeeFolder,
  canManageFolder,
  getFolderShare,
  setFolderShare,
  employeeDirectory,
} from "@/lib/shared-files";

export const runtime = "nodejs";

/** Estado de compartición de una carpeta + directorio de empleados para el selector. */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path") || "";
  if (!path || !isShared(path)) {
    return NextResponse.json({ error: "Ruta inválida." }, { status: 400 });
  }
  if (!(await canSeeFolder(session.username, session.role, path))) {
    return NextResponse.json({ error: "Sin acceso." }, { status: 403 });
  }
  const share = await getFolderShare(path);
  const canManage = await canManageFolder(session.username, session.role, path);
  const employees = canManage ? await employeeDirectory() : [];
  return NextResponse.json({
    allowed: share?.allowed ?? null, // null = todos
    sharedBy: share?.sharedBy ?? null,
    canManage,
    employees,
  });
}

/** Define con qué empleados está compartida una carpeta. Solo dueño o admin. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  let b: { path?: string; allowed?: string[] | null };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const path = b.path || "";
  if (!path || !isShared(path)) {
    return NextResponse.json({ error: "Ruta inválida." }, { status: 400 });
  }
  const allowed = b.allowed === null ? null : Array.isArray(b.allowed) ? b.allowed : null;
  const res = await setFolderShare(path, session, allowed);
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: 403 });
  }
  return NextResponse.json({ ok: true });
}
