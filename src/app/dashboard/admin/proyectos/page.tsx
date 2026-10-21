import DashboardShell from "@/components/dashboard/DashboardShell";
import ProyectosManager from "@/components/proyectos/ProyectosManager";
import { requireAdmin } from "@/lib/auth-server";
import { getDB } from "@/lib/db";
import { buildCatalogs, conceptPU } from "@/lib/pu";

export const dynamic = "force-dynamic";

/**
 * Pestaña central del flujo de presupuestos: se elige un proyecto y se trabaja
 * cada "hoja" del Excel (presupuesto, cotización, cronograma, administración,
 * nómina) como sub-pestaña. Solo admin (maneja costos y márgenes).
 */
export default async function ProyectosAdmin() {
  await requireAdmin();
  const db = await getDB();
  const catalogs = buildCatalogs(db);
  // Biblioteca de conceptos con su P.U. calculado, para armar presupuestos.
  const conceptos = db.concepts.map((c) => ({
    id: c.id,
    clave: c.clave,
    concepto: c.concepto,
    descripcion: c.descripcion,
    unidad: c.unidad,
    pu: conceptPU(c, catalogs),
    tiempoPU: c.tiempoPU ?? null,
  }));
  return (
    <DashboardShell role="admin" title="Proyectos">
      <ProyectosManager
        proyectos={db.projects}
        budgets={db.budgets}
        conceptos={conceptos}
      />
    </DashboardShell>
  );
}
