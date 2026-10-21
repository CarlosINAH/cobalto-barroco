import DashboardShell from "@/components/dashboard/DashboardShell";
import CatalogosManager from "@/components/costos/CatalogosManager";
import { requireAdmin } from "@/lib/auth-server";
import { getDB } from "@/lib/db";
import { buildCatalogs, recipeCost, conceptBreakdown } from "@/lib/pu";

export const dynamic = "force-dynamic";

/**
 * Catálogos globales del módulo de Precios Unitarios (solo admin: precios,
 * salarios y márgenes son datos sensibles). Los valores calculados (costo de
 * receta, P.U. de concepto) se resuelven aquí con el motor `pu.ts` para no
 * duplicar las fórmulas en el cliente.
 */
export default async function CostosAdmin() {
  await requireAdmin();
  const db = await getDB();
  const catalogs = buildCatalogs(db);

  const recetas = db.recipes.map((r) => ({
    ...r,
    costo: recipeCost(r, catalogs),
  }));

  const conceptos = db.concepts.map((c) => {
    const b = conceptBreakdown(c, catalogs);
    return { ...c, costoDirecto: b.costoDirecto, pu: b.pu, porTipo: b.porTipo };
  });

  return (
    <DashboardShell role="admin" title="Costos y Precios Unitarios">
      <CatalogosManager
        materiales={db.costMaterials}
        recetas={recetas}
        salarios={db.laborRates}
        conceptos={conceptos}
      />
    </DashboardShell>
  );
}
