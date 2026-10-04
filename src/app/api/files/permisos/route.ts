import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import type { FolderPermLevel } from "@/lib/db";
import {
  isShared,
  getFolderShare,
  permOf,
  canManageFolder,
  canSeeFolder,
  setFolderPerms,
  employeeDirectory,
} from "@/lib/shared-files";

export const runtime = "nodejs";

const LEVELS: FolderPermLevel[] = ["total", "escritura", "lectura", "none"];

/** Permisos actuales de una carpeta (nivel por empleado) + directorio. */
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
  const employees = await employeeDirectory();

  // Nivel efectivo actual de cada empleado, para prellenar el formulario.
  const levels: Record<string, FolderPermLevel> = {};
  for (const e of employees) {
    levels[e.username] = permOf(share ?? undefined, e.username, "empleado");
  }

  return NextResponse.json({
    levels,
    defaultPerm: share?.defaultPerm ?? (share?.allowed === null ? "escritura" : "escritura"),
    owner: share?.sharedBy ?? null,
    canManage: await canManageFolder(session.username, session.role, path),
    employees,
  });
}

/** Guarda los permisos por empleado de una carpeta. Solo dueño o admin. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  let b: {
    path?: string;
    perms?: Record<string, FolderPermLevel>;
    defaultPerm?: FolderPermLevel;
  };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const path = b.path || "";
  if (!path || !isShared(path)) {
    return NextResponse.json({ error: "Ruta inválida." }, { status: 400 });
  }
  const defaultPerm: FolderPermLevel = LEVELS.includes(b.defaultPerm as FolderPermLevel)
    ? (b.defaultPerm as FolderPermLevel)
    : "escritura";
  const perms = b.perms && typeof b.perms === "object" ? b.perms : {};

  const res = await setFolderPerms(path, session, perms, defaultPerm);
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: 403 });
  }
  return NextResponse.json({ ok: true });
}
