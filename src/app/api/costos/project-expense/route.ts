import { NextResponse } from "next/server";
import { getSession, canWriteWorkArea } from "@/lib/auth-server";
import { getDB, mutate, newId, type LedgerEntry } from "@/lib/db";
import { buildCatalogs, recipeCost } from "@/lib/pu";
import { registrarMovimiento } from "@/lib/bitacora";

export const runtime = "nodejs";

/** Cantidad del rendimiento de una receta ("950 ML" → 950). */
function rendQty(r: string): number {
  const m = (r || "").match(/([\d]+(?:[.,][\d]+)?)/);
  const q = m ? parseFloat(m[1].replace(",", ".")) : 0;
  return q > 0 ? q : 1;
}

/**
 * Registra una receta como gasto (egreso) de un proyecto. Lo puede hacer el
 * área de trabajo (admin / nivel total) o quien participa en ese proyecto
 * (está asignado o lo edita) — no cualquier sesión sobre cualquier proyecto.
 * El monto se calcula del costo de la receta × la cantidad a preparar; alimenta
 * la Administración/Balance del proyecto (que solo ve admin).
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  let b: { projectId?: string; recipeId?: string; cantidad?: number; nota?: string };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const db = await getDB();
  const project = db.projects.find((p) => p.id === b.projectId);
  const recipe = db.recipes.find((r) => r.id === b.recipeId);
  if (!project || !recipe)
    return NextResponse.json({ error: "Proyecto o receta no encontrados." }, { status: 404 });

  // Autorización: área de trabajo, o participante/editor del proyecto.
  const emp = db.employees.find(
    (e) => e.username.toLowerCase() === session.username.toLowerCase(),
  );
  const participa = !!emp && (
    (emp.proyectoIds ?? []).includes(project.id) ||
    (emp.proyectoEdita ?? []).includes(project.id) ||
    emp.proyectoId === project.id
  );
  if (!participa && !(await canWriteWorkArea(session)))
    return NextResponse.json({ error: "No autorizado para este proyecto." }, { status: 403 });

  const cantidad = Number(b.cantidad) || 0;
  if (cantidad <= 0)
    return NextResponse.json({ error: "Indica una cantidad a preparar." }, { status: 400 });

  const costoLote = recipeCost(recipe, buildCatalogs(db));
  const monto = (costoLote / rendQty(recipe.rendimiento)) * cantidad;

  const entry: LedgerEntry = {
    id: newId("MOV"),
    projectId: project.id,
    fecha: new Date().toISOString().slice(0, 10),
    categoria: "material",
    tipo: "egreso",
    concepto: `Receta: ${recipe.nombre} ×${cantidad}${recipe.unidad ? " " + recipe.unidad : ""}${b.nota ? " — " + String(b.nota).trim() : ""} (${session.username})`,
    monto: Math.round(monto * 100) / 100,
    createdAt: Date.now(),
  };
  await mutate((d) => d.ledgerEntries.push(entry));
  await registrarMovimiento(session, {
    accion: "crear", entidad: "movimiento", entidadId: entry.id,
    descripcion: `Receta: ${recipe.nombre} ×${cantidad} (${entry.monto})`,
    projectId: project.id,
  });
  return NextResponse.json({ ok: true, entry });
}
