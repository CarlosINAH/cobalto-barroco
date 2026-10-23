import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import {
  mutate,
  type CostMaterial,
  type Recipe,
  type LaborRate,
} from "@/lib/db";

export const runtime = "nodejs";

/**
 * Importación masiva de catálogos del módulo de costos (solo admin). Recibe el
 * JSON exportado del importador de Excel y REEMPLAZA las colecciones incluidas
 * (materiales, recetas, salarios). No toca el resto de la base de datos. Pensado
 * para sembrar los catálogos en el NAS, donde no hay acceso directo al disco.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin")
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  let b: {
    costMaterials?: CostMaterial[];
    recipes?: Recipe[];
    laborRates?: LaborRate[];
  };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Archivo inválido." }, { status: 400 });
  }

  const importado = await mutate((db) => {
    const out: { costMaterials?: number; recipes?: number; laborRates?: number } = {};
    if (Array.isArray(b.costMaterials)) {
      db.costMaterials = b.costMaterials;
      out.costMaterials = b.costMaterials.length;
    }
    if (Array.isArray(b.recipes)) {
      db.recipes = b.recipes;
      out.recipes = b.recipes.length;
    }
    if (Array.isArray(b.laborRates)) {
      db.laborRates = b.laborRates;
      out.laborRates = b.laborRates.length;
    }
    return out;
  });

  return NextResponse.json({ ok: true, importado });
}
