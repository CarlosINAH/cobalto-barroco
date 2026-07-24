import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { mutate, type Employee } from "@/lib/db";

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
  let b: Partial<Employee> & { habilidades?: string[] | string };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const updated = await mutate((db) => {
    const e = db.employees.find((x) => x.id === id);
    if (!e) return null;
    if (b.nombre !== undefined) e.nombre = b.nombre.trim();
    if (b.email !== undefined) e.email = b.email.trim();
    if (b.rol !== undefined) e.rol = b.rol.trim();
    if (b.ranking !== undefined)
      e.ranking = Math.max(0, Math.min(100, Number(b.ranking) || 0));
    if (b.proyectoId !== undefined) e.proyectoId = b.proyectoId || null;
    if (b.habilidades !== undefined) {
      e.habilidades = Array.isArray(b.habilidades)
        ? b.habilidades
        : String(b.habilidades)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
    }
    return e;
  });
  if (!updated)
    return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  return NextResponse.json({ ok: true, employee: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const { id } = await params;
  await mutate((db) => {
    db.employees = db.employees.filter((x) => x.id !== id);
  });
  return NextResponse.json({ ok: true });
}
