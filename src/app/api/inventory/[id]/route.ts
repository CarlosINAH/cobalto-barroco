import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { mutate, type InventoryItem } from "@/lib/db";

export const runtime = "nodejs";

async function admin() {
  const s = await getSession();
  return s && s.role === "admin" ? s : null;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await admin()))
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const { id } = await params;
  let b: Partial<InventoryItem>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const updated = await mutate((db) => {
    const it = db.inventory.find((x) => x.id === id);
    if (!it) return null;
    if (b.nombre !== undefined) it.nombre = b.nombre.trim();
    if (b.categoria !== undefined) it.categoria = b.categoria.trim();
    if (b.cantidad !== undefined) it.cantidad = Number(b.cantidad) || 0;
    if (b.unidad !== undefined) it.unidad = b.unidad.trim();
    if (b.ubicacion !== undefined) it.ubicacion = b.ubicacion.trim();
    if (b.nota !== undefined) it.nota = b.nota.trim();
    return it;
  });
  if (!updated)
    return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  return NextResponse.json({ ok: true, item: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await admin()))
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const { id } = await params;
  await mutate((db) => {
    db.inventory = db.inventory.filter((x) => x.id !== id);
  });
  return NextResponse.json({ ok: true });
}
