import { NextResponse } from "next/server";
import { getSession, canWriteWorkArea } from "@/lib/auth-server";
import {
  mutate,
  type CostMaterial,
  type Recipe,
  type LaborRate,
  type Project,
  type PayrollEntry,
  type LedgerEntry,
  type CVEntry,
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
  if (!session || !(await canWriteWorkArea(session)))
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  let b: {
    costMaterials?: CostMaterial[];
    recipes?: Recipe[];
    laborRates?: LaborRate[];
    projects?: Project[];
    payrollEntries?: PayrollEntry[];
    ledgerEntries?: LedgerEntry[];
    cvEntries?: CVEntry[];
    /**
     * "admin": antes de insertar, reemplaza los gastos y la nómina DE EMPRESA
     * (projectId == null) por lo que trae el archivo. Deja intactos los
     * movimientos ligados a un proyecto. Hace idempotente la carga de la hoja
     * de Administración (sin duplicar lo ya subido).
     */
    mode?: string;
  };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Archivo inválido." }, { status: 400 });
  }

  const importado = await mutate((db) => {
    if (b.mode === "admin") {
      if (Array.isArray(b.ledgerEntries))
        db.ledgerEntries = db.ledgerEntries.filter((e) => e.projectId !== null);
      if (Array.isArray(b.payrollEntries))
        db.payrollEntries = db.payrollEntries.filter((e) => e.projectId !== null);
    }
    const out: {
      costMaterials?: number;
      recipes?: number;
      laborRates?: number;
      projects?: number;
      payrollEntries?: number;
      ledgerEntries?: number;
      cvEntries?: number;
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
    // Proyectos: UPSERT emparejando por id O por nombre+ubicación (evita
    // duplicar una obra aunque cambie su id generado). Al emparejar por nombre,
    // se conserva el id existente para no romper lo ligado a esa obra
    // (presupuestos, movimientos, nómina por proyecto).
    if (Array.isArray(b.projects)) {
      const norm = (s?: string) => (s || "").trim().toLowerCase();
      for (const p of b.projects) {
        let i = db.projects.findIndex((x) => x.id === p.id);
        if (i < 0)
          i = db.projects.findIndex(
            (x) => norm(x.nombre) === norm(p.nombre) && norm(x.ubicacion) === norm(p.ubicacion),
          );
        if (i >= 0) db.projects[i] = { ...p, id: db.projects[i].id };
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
    // CV de la empresa: se reemplaza (fuente canónica del Excel CURRÍCULUM).
    if (Array.isArray(b.cvEntries)) {
      db.cvEntries = b.cvEntries;
      out.cvEntries = b.cvEntries.length;
    }
    return out;
  });

  return NextResponse.json({ ok: true, importado });
}
