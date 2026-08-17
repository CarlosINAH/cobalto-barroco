import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { mutate, type Supplier } from "@/lib/db";

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
  let b: Partial<Supplier>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const updated = await mutate((db) => {
    const s = db.suppliers.find((x) => x.id === id);
    if (!s) return null;
    if (b.nombre !== undefined) s.nombre = b.nombre.trim();
    if (b.contacto !== undefined) s.contacto = b.contacto.trim();
    if (b.telefono !== undefined) s.telefono = b.telefono.trim();
    if (b.email !== undefined) s.email = b.email.trim();
    if (b.categoria !== undefined) s.categoria = b.categoria.trim();
    if (b.direccion !== undefined) s.direccion = b.direccion.trim();
    if (b.nota !== undefined) s.nota = b.nota.trim();
    return s;
  });
  if (!updated)
    return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  return NextResponse.json({ ok: true, supplier: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const { id } = await params;
  await mutate((db) => {
    db.suppliers = db.suppliers.filter((x) => x.id !== id);
  });
  return NextResponse.json({ ok: true });
}
