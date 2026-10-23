import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { mutate, type PayrollEntry } from "@/lib/db";

export const runtime = "nodejs";

async function requireAdmin() {
  const session = await getSession();
  return session && session.role === "admin" ? session : null;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const { id } = await params;
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
    if (b.monto !== undefined) e.monto = Number(b.monto) || 0;
    if (b.pagado !== undefined) e.pagado = b.pagado === true;
    if (b.nota !== undefined) e.nota = b.nota.trim() || undefined;
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
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const { id } = await params;
  await mutate((db) => {
    db.payrollEntries = db.payrollEntries.filter((x) => x.id !== id);
  });
  return NextResponse.json({ ok: true });
}
