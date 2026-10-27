import { NextResponse } from "next/server";
import { requireWorkAreaWrite } from "@/lib/auth-server";
import { mutate, type Recipe } from "@/lib/db";
import { buildCatalogs, recipeCost } from "@/lib/pu";
import { cleanComponents } from "@/lib/costos";

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
  let b: Partial<Recipe>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const updated = await mutate((db) => {
    const r = db.recipes.find((x) => x.id === id);
    if (!r) return null;
    if (b.nombre !== undefined) r.nombre = b.nombre.trim();
    if (b.rendimiento !== undefined) r.rendimiento = b.rendimiento.trim();
    if (b.unidad !== undefined) r.unidad = b.unidad.trim();
    if (b.nota !== undefined) r.nota = b.nota.trim();
    if (b.costoFinal !== undefined)
      r.costoFinal = b.costoFinal != null ? Number(b.costoFinal) : undefined;
    if (b.componentes !== undefined) r.componentes = cleanComponents(b.componentes);
    r.costo = recipeCost(r, buildCatalogs(db)); // recálculo en vivo
    return r;
  });
  if (!updated)
    return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  return NextResponse.json({ ok: true, receta: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const { id } = await params;
  await mutate((db) => {
    db.recipes = db.recipes.filter((x) => x.id !== id);
  });
  return NextResponse.json({ ok: true });
}
