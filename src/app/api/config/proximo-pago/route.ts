import { NextResponse } from "next/server";
import { getSession, canWriteSection } from "@/lib/auth-server";
import { getDB, mutate, type ProximoPago } from "@/lib/db";

export const runtime = "nodejs";

/** Devuelve la próxima fecha de pago (cualquier empleado con sesión la ve). */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const db = await getDB();
  return NextResponse.json({ proximoPago: db.proximoPago ?? null });
}

/** Fija la próxima fecha de pago. Solo quien edita Administración (admin/total). */
export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session || !(await canWriteSection(session, "administracion")))
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  let b: { fecha?: string; nota?: string };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const fecha = (b.fecha || "").trim();
  // Vacío = borrar la fecha. Con fecha, exige formato YYYY-MM-DD.
  if (fecha && !/^\d{4}-\d{2}-\d{2}$/.test(fecha))
    return NextResponse.json({ error: "Fecha inválida." }, { status: 400 });
  const proximoPago: ProximoPago | null = fecha
    ? { fecha, nota: (b.nota || "").trim() || undefined, actualizado: Date.now() }
    : null;
  await mutate((db) => { db.proximoPago = proximoPago; });
  return NextResponse.json({ ok: true, proximoPago });
}
