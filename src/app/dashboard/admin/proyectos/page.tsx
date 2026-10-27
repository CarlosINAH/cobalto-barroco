import DashboardShell from "@/components/dashboard/DashboardShell";
import ProyectosYPresupuesto from "@/components/proyectos/ProyectosYPresupuesto";
import { requireAdmin } from "@/lib/auth-server";
import { getDB } from "@/lib/db";
import { buildCatalogs, recipeCost, conceptBreakdown } from "@/lib/pu";

export const dynamic = "force-dynamic";

/**
 * Sección Proyectos. Dos submenús:
 * - Proyectos activos: obras en curso con sus hojas (presupuesto, cronograma,
 *   administración, nómina, balance).
 * - Presupuesto: armador de cotizaciones + catálogos (materiales, salarios,
 *   recetas, conceptos/costos unitarios). Al aprobar, el presupuesto se vuelve
 *   proyecto activo.
 * Solo admin (maneja costos y márgenes).
 */
export default async function ProyectosAdmin() {
  await requireAdmin();
  const db = await getDB();
  const catalogs = buildCatalogs(db);

  const conceptosFull = db.concepts.map((c) => {
    const b = conceptBreakdown(c, catalogs);
    return { ...c, costoDirecto: b.costoDirecto, pu: b.pu, porTipo: b.porTipo };
  });
  // Conceptos con desglose para ProyectosManager (balance).
  const conceptos = conceptosFull.map((c) => ({
    id: c.id, clave: c.clave, concepto: c.concepto, descripcion: c.descripcion,
    unidad: c.unidad, pu: c.pu, tiempoPU: c.tiempoPU ?? null, porTipo: c.porTipo,
  }));
  // Lista ligera para el selector del armador de presupuesto.
  const conceptosPick = conceptosFull.map((c) => ({
    id: c.id, clave: c.clave, concepto: c.concepto, descripcion: c.descripcion,
    unidad: c.unidad, pu: c.pu, tiempoPU: c.tiempoPU ?? null,
  }));
  const recetas = db.recipes.map((r) => ({ ...r, costo: recipeCost(r, catalogs) }));

  return (
    <DashboardShell role="admin" title="Proyectos">
      <ProyectosYPresupuesto
        proyectos={{
          proyectos: db.projects,
          budgets: db.budgets,
          conceptos,
          ledger: db.ledgerEntries,
          payroll: db.payrollEntries,
        }}
        presupuesto={{
          budgets: db.budgets,
          conceptos: conceptosPick,
          projects: db.projects,
          catalog: {
            materiales: db.costMaterials,
            recetas,
            salarios: db.laborRates,
            conceptos: conceptosFull,
          },
        }}
      />
    </DashboardShell>
  );
}
