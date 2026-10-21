import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { mutate, type Budget } from "@/lib/db";
import { cleanBudgetLines } from "@/lib/costos";

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
  let b: Partial<Budget>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const updated = await mutate((db) => {
    const p = db.budgets.find((x) => x.id === id);
    if (!p) return null;
    if (b.nombre !== undefined) p.nombre = b.nombre.trim();
    if (b.cliente !== undefined) p.cliente = b.cliente.trim();
    if (b.lineas !== undefined) p.lineas = cleanBudgetLines(b.lineas);
    if (b.factorIva !== undefined) p.factorIva = Number(b.factorIva) || 0;
    if (b.factorIndirectos !== undefined)
      p.factorIndirectos = Number(b.factorIndirectos) || 0;
    if (b.factorUtilidad !== undefined)
      p.factorUtilidad = Number(b.factorUtilidad) || 0;
    p.updatedAt = Date.now();
    return p;
  });
  if (!updated)
    return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  return NextResponse.json({ ok: true, budget: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const { id } = await params;
  await mutate((db) => {
    db.budgets = db.budgets.filter((x) => x.id !== id);
  });
  return NextResponse.json({ ok: true });
}
