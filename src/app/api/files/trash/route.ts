import { NextResponse } from "next/server";
import { getSession, credsForPath } from "@/lib/auth-server";
import {
  listTrash,
  restoreItem,
  deleteTrashEntry,
  emptyTrash,
  TRASH_ROOT,
} from "@/lib/trash";

export const runtime = "nodejs";

/** Lista la papelera (admin: todo; empleado: lo suyo). */
export async function GET() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const items = await listTrash(session.username, session.role);
  return NextResponse.json({ items, role: session.role });
}

/**
 * Acciones sobre la papelera:
 * - restore (id): restaura (admin o quien lo envió).
 * - delete (id): borra definitivamente un elemento (solo admin).
 * - empty: vacía toda la papelera (solo admin).
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  let b: { action?: string; id?: string };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  // La papelera vive dentro de "Archivos compartidos", así que sus operaciones
  // usan la cuenta de servicio del área compartida (si está configurada).
  const creds = credsForPath(session, TRASH_ROOT);
  let res: { ok: boolean; error?: string };

  if (b.action === "restore") {
    if (!b.id)
      return NextResponse.json({ error: "Falta el elemento." }, { status: 400 });
    res = await restoreItem(creds, session.username, session.role, b.id);
  } else if (b.action === "delete") {
    if (!b.id)
      return NextResponse.json({ error: "Falta el elemento." }, { status: 400 });
    res = await deleteTrashEntry(creds, session.role, b.id);
  } else if (b.action === "empty") {
    res = await emptyTrash(creds, session.role);
  } else {
    return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
  }

  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: 403 });
  }
  return NextResponse.json({ ok: true });
}
