import { NextResponse } from "next/server";
import { getSession, canWorkOnProject } from "@/lib/auth-server";
import { getDB, mutate, type PayrollEntry } from "@/lib/db";

export const runtime = "nodejs";

async function autorizado(id: string): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;
  const db = await getDB();
  const e = db.payrollEntries.find((x) => x.id === id);
  return canWorkOnProject(session, e?.projectId ?? null);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!(await autorizado(id)))
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  let b: Partial<PayrollEntry>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const updated = await mutate((db) => {
    const e = db.payrollEntries.find((x) => x.id === id);
    if (!e) return null;
    if (b.persona !== undefined) e.persona = b.persona.trim();
    if (b.rol !== undefined) e.rol = b.rol.trim() || undefined;
    if (b.periodo !== undefined) e.periodo = b.periodo.trim();
    if (b.fecha !== undefined) e.fecha = b.fecha.trim() || undefined;
    if (b.categoria !== undefined) e.categoria = b.categoria.trim() || undefined;
    if (b.pagado !== undefined) e.pagado = b.pagado === true;
    if (b.nota !== undefined) e.nota = b.nota.trim() || undefined;
    if (b.employeeId !== undefined) e.employeeId = b.employeeId ? String(b.employeeId) : undefined;
    if (b.diaria !== undefined) e.diaria = b.diaria != null ? Number(b.diaria) || 0 : undefined;
    if (b.diasQuincena !== undefined) e.diasQuincena = b.diasQuincena != null ? Number(b.diasQuincena) || 0 : undefined;
    if (b.diasTrabajados !== undefined) e.diasTrabajados = b.diasTrabajados != null ? Number(b.diasTrabajados) || 0 : undefined;
    if (b.descuento !== undefined) e.descuento = b.descuento != null ? Number(b.descuento) || 0 : undefined;
    // El monto explícito gana; si no, y hay tarifa diaria, se recalcula.
    if (b.monto !== undefined) e.monto = Number(b.monto) || 0;
    else if (e.diaria != null)
      e.monto = e.diaria * (e.diasTrabajados ?? e.diasQuincena ?? 0) - (e.descuento ?? 0);
    return e;
  });
  if (!updated)
    return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  return NextResponse.json({ ok: true, entry: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!(await autorizado(id)))
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  await mutate((db) => {
    db.payrollEntries = db.payrollEntries.filter((x) => x.id !== id);
  });
  return NextResponse.json({ ok: true });
}
