import { NextResponse } from "next/server";
import { requireWorkAreaWrite } from "@/lib/auth-server";
import { mutate, type LaborRate } from "@/lib/db";

export const runtime = "nodejs";

async function requireAdmin() {
  return requireWorkAreaWrite();
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const { id } = await params;
  let b: Partial<LaborRate>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const updated = await mutate((db) => {
    const r = db.laborRates.find((x) => x.id === id);
    if (!r) return null;
    if (b.rol !== undefined) r.rol = b.rol.trim();
    if (b.jornada !== undefined) r.jornada = Number(b.jornada) || 0;
    if (b.hora !== undefined) r.hora = Number(b.hora) || 0;
    if (b.semana !== undefined) r.semana = Number(b.semana) || 0;
    if (b.mes !== undefined) r.mes = Number(b.mes) || 0;
    return r;
  });
  if (!updated)
    return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  return NextResponse.json({ ok: true, salario: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const { id } = await params;
  await mutate((db) => {
    db.laborRates = db.laborRates.filter((x) => x.id !== id);
  });
  return NextResponse.json({ ok: true });
}
