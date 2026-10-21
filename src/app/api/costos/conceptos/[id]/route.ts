import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { mutate, type Concept } from "@/lib/db";
import { buildCatalogs, recomputeConcept } from "@/lib/pu";
import { cleanInputs } from "@/lib/costos";

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
  let b: Partial<Concept>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const updated = await mutate((db) => {
    const c = db.concepts.find((x) => x.id === id);
    if (!c) return null;
    if (b.clave !== undefined) c.clave = b.clave.trim();
    if (b.concepto !== undefined) c.concepto = b.concepto.trim();
    if (b.descripcion !== undefined) c.descripcion = b.descripcion.trim();
    if (b.unidad !== undefined) c.unidad = b.unidad.trim();
    if (b.insumos !== undefined) c.insumos = cleanInputs(b.insumos);
    if (b.factorIndirectos !== undefined)
      c.factorIndirectos = Number(b.factorIndirectos) || 0;
    if (b.factorUtilidad !== undefined)
      c.factorUtilidad = Number(b.factorUtilidad) || 0;
    if (b.tiempoPU !== undefined)
      c.tiempoPU = b.tiempoPU != null ? Number(b.tiempoPU) : null;
    if (b.global !== undefined) c.global = b.global;
    recomputeConcept(c, buildCatalogs(db)); // recálculo en vivo del P.U.
    return c;
  });
  if (!updated)
    return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  return NextResponse.json({ ok: true, concepto: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const { id } = await params;
  await mutate((db) => {
    db.concepts = db.concepts.filter((x) => x.id !== id);
  });
  return NextResponse.json({ ok: true });
}
