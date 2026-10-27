import { NextResponse } from "next/server";
import { requireWorkAreaWrite } from "@/lib/auth-server";
import { mutate, newId, type Budget, type Project } from "@/lib/db";
import { cleanBudgetLines } from "@/lib/costos";

const ESTADOS = ["borrador", "enviado", "aprobado", "rechazado"] as const;

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
  let b: Partial<Budget>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const updated = await mutate((db) => {
    const p = db.budgets.find((x) => x.id === id);
    if (!p) return null;
    if (b.nombre !== undefined) p.nombre = b.nombre.trim();
    if (b.cliente !== undefined) p.cliente = b.cliente.trim();
    if (b.obra !== undefined) p.obra = b.obra.trim() || undefined;
    if (b.lineas !== undefined) p.lineas = cleanBudgetLines(b.lineas);
    if (b.factorIva !== undefined) p.factorIva = Number(b.factorIva) || 0;
    if (b.factorIndirectos !== undefined)
      p.factorIndirectos = Number(b.factorIndirectos) || 0;
    if (b.factorUtilidad !== undefined)
      p.factorUtilidad = Number(b.factorUtilidad) || 0;
    if (b.personas !== undefined)
      p.personas = b.personas != null ? Number(b.personas) : undefined;

    // Transiciones del ciclo de vida.
    if (b.estado !== undefined && ESTADOS.includes(b.estado)) {
      p.estado = b.estado;
      const now = Date.now();
      if (b.estado === "enviado") p.enviadoEn = now;
      if (b.estado === "aprobado" || b.estado === "rechazado") p.decididoEn = now;
      // Al aprobar, si aún no hay proyecto ligado, se crea uno a partir del
      // presupuesto y se enlaza (el presupuesto se convierte en obra activa).
      if (b.estado === "aprobado" && !p.projectId) {
        const subtotal = p.lineas.reduce((a, l) => a + l.pu * l.cantidad, 0);
        const proj: Project = {
          id: newId("OBRA"),
          nombre: p.obra || p.cliente || p.nombre || "Obra",
          ubicacion: "",
          inicio: new Date().toISOString().slice(0, 10),
          entrega: "",
          avance: 0,
          estado: "activo",
          desc: `Creado al aprobar el presupuesto ${p.id}.`,
          cliente: p.cliente || undefined,
          montoTotal: Math.round(subtotal * 100) / 100,
          anticipo: 0,
          egresos: 0,
          utilidad: 0,
          createdAt: Date.now(),
        };
        db.projects.push(proj);
        p.projectId = proj.id;
      }
    }
    p.updatedAt = Date.now();
    return p;
  });
  if (!updated)
    return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  return NextResponse.json({ ok: true, budget: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const { id } = await params;
  await mutate((db) => {
    db.budgets = db.budgets.filter((x) => x.id !== id);
  });
  return NextResponse.json({ ok: true });
}
