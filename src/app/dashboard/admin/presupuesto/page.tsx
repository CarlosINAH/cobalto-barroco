import DashboardShell from "@/components/dashboard/DashboardShell";
import PresupuestoManager from "@/components/presupuesto/PresupuestoManager";
import { requireAdmin } from "@/lib/auth-server";
import { getDB } from "@/lib/db";
import { buildCatalogs, recipeCost, conceptBreakdown } from "@/lib/pu";

export const dynamic = "force-dynamic";

/**
 * Sección Presupuesto: armador de cotizaciones + panel de presupuestos con su
 * ciclo de vida (borrador → enviado → aprobado→proyecto / rechazado) y los
 * catálogos (materiales, salarios, recetas, conceptos) como sub-pestañas.
 */
export default async function PresupuestoAdmin() {
  await requireAdmin();
  const db = await getDB();
  const catalogs = buildCatalogs(db);

  const recetas = db.recipes.map((r) => ({ ...r, costo: recipeCost(r, catalogs) }));
  const conceptosFull = db.concepts.map((c) => {
    const b = conceptBreakdown(c, catalogs);
    return { ...c, costoDirecto: b.costoDirecto, pu: b.pu, porTipo: b.porTipo };
  });
  // Lista ligera de conceptos para el selector del armador.
  const conceptosPick = conceptosFull.map((c) => ({
    id: c.id, clave: c.clave, concepto: c.concepto, descripcion: c.descripcion,
    unidad: c.unidad, pu: c.pu, tiempoPU: c.tiempoPU ?? null,
  }));

  return (
    <DashboardShell role="admin" title="Presupuesto">
      <PresupuestoManager
        budgets={db.budgets}
        conceptos={conceptosPick}
        projects={db.projects}
        catalog={{
          materiales: db.costMaterials,
          recetas,
          salarios: db.laborRates,
          conceptos: conceptosFull,
        }}
      />
    </DashboardShell>
  );
}
