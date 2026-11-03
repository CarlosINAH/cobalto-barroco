import DashboardShell from "@/components/dashboard/DashboardShell";
import PresupuestoManager from "@/components/presupuesto/PresupuestoManager";
import { requireSectionView } from "@/lib/auth-server";
import { getDB } from "@/lib/db";
import { buildCatalogs, recipeCost, conceptBreakdown } from "@/lib/pu";

export const dynamic = "force-dynamic";

/**
 * Presupuesto para editores: el mismo armador de cotizaciones que usa
 * administración. Un residente/editor con acceso a Proyectos puede armar
 * cualquier presupuesto (catálogo libre). Guardar requiere acceso "total" en
 * Proyectos; la API lo valida. Se oculta a quien no tenga acceso a Proyectos.
 */
export default async function PresupuestoEmpleado() {
  await requireSectionView("proyectos");
  const db = await getDB();
  const catalogs = buildCatalogs(db);

  const recetas = db.recipes.map((r) => ({ ...r, costo: recipeCost(r, catalogs) }));
  const conceptosFull = db.concepts.map((c) => {
    const b = conceptBreakdown(c, catalogs);
    return { ...c, costoDirecto: b.costoDirecto, pu: b.pu, porTipo: b.porTipo };
  });
  const conceptosPick = conceptosFull.map((c) => ({
    id: c.id, clave: c.clave, concepto: c.concepto, descripcion: c.descripcion,
    unidad: c.unidad, pu: c.pu, tiempoPU: c.tiempoPU ?? null,
    materialIntervencion: c.materialIntervencion,
    cuadrillaPersonas: c.cuadrillaPersonas,
    cuadrilla: c.cuadrilla,
  }));

  return (
    <DashboardShell role="empleado" title="Presupuesto">
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
