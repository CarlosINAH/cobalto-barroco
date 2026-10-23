import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { mutate, type LedgerEntry } from "@/lib/db";

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
  let b: Partial<LedgerEntry>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const updated = await mutate((db) => {
    const e = db.ledgerEntries.find((x) => x.id === id);
    if (!e) return null;
    if (b.fecha !== undefined) e.fecha = b.fecha.trim();
    if (b.categoria !== undefined) e.categoria = b.categoria.trim();
    if (b.tipo !== undefined) e.tipo = b.tipo === "ingreso" ? "ingreso" : "egreso";
    if (b.concepto !== undefined) e.concepto = b.concepto.trim();
    if (b.monto !== undefined) e.monto = Number(b.monto) || 0;
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
    db.ledgerEntries = db.ledgerEntries.filter((x) => x.id !== id);
  });
  return NextResponse.json({ ok: true });
}
