import { NextResponse } from "next/server";
import { getSession, canWriteSection } from "@/lib/auth-server";
import { mutate, type CVEntry } from "@/lib/db";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || !(await canWriteSection(session, "cv")))
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const { id } = await params;
  let b: Partial<CVEntry>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const updated = await mutate((db) => {
    const e = db.cvEntries.find((x) => x.id === id);
    if (!e) return null;
    if (b.clave !== undefined) e.clave = b.clave.trim() || undefined;
    if (b.anio !== undefined) { const n = Number(b.anio); if (Number.isFinite(n) && n > 0) e.anio = Math.trunc(n); }
    if (b.fecha !== undefined) e.fecha = b.fecha.trim();
    if (b.clasificacion !== undefined) e.clasificacion = b.clasificacion.trim() || undefined;
    if (b.tipoBien !== undefined) e.tipoBien = b.tipoBien.trim() || undefined;
    if (b.lugar !== undefined) e.lugar = b.lugar.trim() || undefined;
    if (b.sitio !== undefined) e.sitio = b.sitio.trim() || undefined;
    if (b.titulo !== undefined) e.titulo = b.titulo.trim();
    if (b.descripcion !== undefined) e.descripcion = b.descripcion.trim() || undefined;
    if (b.colaboracion !== undefined) e.colaboracion = b.colaboracion.trim() || undefined;
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
  const session = await getSession();
  if (!session || !(await canWriteSection(session, "cv")))
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const { id } = await params;
  await mutate((db) => {
    db.cvEntries = db.cvEntries.filter((x) => x.id !== id);
  });
  return NextResponse.json({ ok: true });
}
