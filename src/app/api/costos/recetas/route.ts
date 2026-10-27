import { NextResponse } from "next/server";
import { requireWorkAreaWrite } from "@/lib/auth-server";
import { getDB, mutate, newId, type Recipe } from "@/lib/db";
import { buildCatalogs, recipeCost } from "@/lib/pu";
import { cleanComponents } from "@/lib/costos";

export const runtime = "nodejs";

async function requireAdmin() {
  return requireWorkAreaWrite();
}

export async function GET() {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const db = await getDB();
  return NextResponse.json({ recetas: db.recipes });
}

export async function POST(req: Request) {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  let b: Partial<Recipe>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const nombre = (b.nombre || "").trim();
  if (!nombre)
    return NextResponse.json(
      { error: "El nombre de la receta es obligatorio." },
      { status: 400 },
    );
  const recipe: Recipe = {
    id: newId("REC"),
    nombre,
    rendimiento: (b.rendimiento || "").trim(),
    unidad: (b.unidad || "").trim(),
    componentes: cleanComponents(b.componentes),
    costo: 0,
    costoFinal: b.costoFinal != null ? Number(b.costoFinal) : undefined,
    nota: (b.nota || "").trim(),
    createdAt: Date.now(),
  };
  const saved = await mutate((db) => {
    db.recipes.push(recipe);
    const catalogs = buildCatalogs(db);
    recipe.costo = recipeCost(recipe, catalogs);
    return recipe;
  });
  return NextResponse.json({ ok: true, receta: saved });
}
