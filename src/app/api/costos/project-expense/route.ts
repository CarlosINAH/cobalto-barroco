import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { getDB, mutate, newId, type LedgerEntry } from "@/lib/db";
import { buildCatalogs, recipeCost } from "@/lib/pu";

export const runtime = "nodejs";

/** Cantidad del rendimiento de una receta ("950 ML" → 950). */
function rendQty(r: string): number {
  const m = (r || "").match(/([\d]+(?:[.,][\d]+)?)/);
  const q = m ? parseFloat(m[1].replace(",", ".")) : 0;
  return q > 0 ? q : 1;
}

/**
 * Registra una receta como gasto (egreso) de un proyecto. Accesible a cualquier
 * sesión (los empleados pueden ir sumando gastos por proyecto). El monto se
 * calcula del costo de la receta × la cantidad a preparar; alimenta la
 * Administración/Balance del proyecto (que solo ve admin).
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
  return NextResponse.json({ ok: true, entry });
}
