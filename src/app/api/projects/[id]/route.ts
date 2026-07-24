import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { mutate, type Project } from "@/lib/db";

export const runtime = "nodejs";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "admin") return null;
  return session;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }
  const { id } = await params;
  let b: Partial<Project>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const updated = await mutate((db) => {
    const p = db.projects.find((x) => x.id === id);
    if (!p) return null;
    if (b.nombre !== undefined) p.nombre = b.nombre.trim();
    if (b.ubicacion !== undefined) p.ubicacion = b.ubicacion.trim();
    if (b.inicio !== undefined) p.inicio = b.inicio;
    if (b.entrega !== undefined) p.entrega = b.entrega;
    if (b.avance !== undefined) p.avance = Math.max(0, Math.min(100, Number(b.avance) || 0));
    if (b.estado !== undefined) p.estado = b.estado;
    if (b.desc !== undefined) p.desc = b.desc.trim();
    return p;
  });
  if (!updated) return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  return NextResponse.json({ ok: true, project: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }
  const { id } = await params;
  await mutate((db) => {
    db.projects = db.projects.filter((x) => x.id !== id);
    // Desasigna empleados de ese proyecto.
    db.employees.forEach((e) => {
      if (e.proyectoId === id) e.proyectoId = null;
    });
  });
  return NextResponse.json({ ok: true });
}
