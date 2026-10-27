import { NextResponse } from "next/server";
import { requireWorkAreaWrite } from "@/lib/auth-server";
import { mutate, type CostMaterial } from "@/lib/db";

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
  let b: Partial<CostMaterial>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const updated = await mutate((db) => {
    const m = db.costMaterials.find((x) => x.id === id);
    if (!m) return null;
    if (b.nombre !== undefined) m.nombre = b.nombre.trim();
    if (b.kind === "material" || b.kind === "herramienta" || b.kind === "equipo")
      m.kind = b.kind;
    if (b.categoria !== undefined) m.categoria = b.categoria.trim();
    if (b.precio !== undefined && Number(b.precio) !== m.precio) {
      m.precio = Number(b.precio) || 0;
      m.actualizadoEn = Date.now(); // historial: el precio cambió hoy
    }
    if (b.unidad !== undefined) m.unidad = b.unidad.trim();
    if (b.url !== undefined) m.url = b.url.trim();
    if (b.supplierId !== undefined) m.supplierId = b.supplierId;
    if (b.nota !== undefined) m.nota = b.nota.trim();
    return m;
  });
  if (!updated)
    return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  return NextResponse.json({ ok: true, material: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const { id } = await params;
  await mutate((db) => {
    db.costMaterials = db.costMaterials.filter((x) => x.id !== id);
  });
  return NextResponse.json({ ok: true });
}
