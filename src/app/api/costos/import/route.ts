import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import {
  mutate,
  type CostMaterial,
  type Recipe,
  type LaborRate,
  type Project,
  type PayrollEntry,
  type LedgerEntry,
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
    projects?: Project[];
    payrollEntries?: PayrollEntry[];
    ledgerEntries?: LedgerEntry[];
  };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Archivo inválido." }, { status: 400 });
  }

  const importado = await mutate((db) => {
    const out: {
      costMaterials?: number;
      recipes?: number;
      laborRates?: number;
      projects?: number;
      payrollEntries?: number;
      ledgerEntries?: number;
    } = {};
    // Catálogos: se reemplazan (son la fuente canónica del Excel).
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
    // Proyectos: UPSERT por id (no borra los que ya existen en la plataforma).
    if (Array.isArray(b.projects)) {
      for (const p of b.projects) {
        const i = db.projects.findIndex((x) => x.id === p.id);
        if (i >= 0) db.projects[i] = p;
        else db.projects.push(p);
      }
      out.projects = b.projects.length;
    }
    // Nómina: UPSERT por id (conserva lo que ya haya capturado el usuario).
    if (Array.isArray(b.payrollEntries)) {
      for (const n of b.payrollEntries) {
        const i = db.payrollEntries.findIndex((x) => x.id === n.id);
        if (i >= 0) db.payrollEntries[i] = n;
        else db.payrollEntries.push(n);
      }
      out.payrollEntries = b.payrollEntries.length;
    }
    // Gastos (ledger): UPSERT por id.
    if (Array.isArray(b.ledgerEntries)) {
      for (const g of b.ledgerEntries) {
        const i = db.ledgerEntries.findIndex((x) => x.id === g.id);
        if (i >= 0) db.ledgerEntries[i] = g;
        else db.ledgerEntries.push(g);
      }
      out.ledgerEntries = b.ledgerEntries.length;
    }
    return out;
  });

  return NextResponse.json({ ok: true, importado });
}
