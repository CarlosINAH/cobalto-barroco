import DashboardShell from "@/components/dashboard/DashboardShell";
import ProyectosManager from "@/components/proyectos/ProyectosManager";
import { requireAdmin } from "@/lib/auth-server";
import { getDB } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Pestaña central del flujo de presupuestos: se elige un proyecto y se trabaja
 * cada "hoja" del Excel (presupuesto, cotización, cronograma, administración,
 * nómina) como sub-pestaña. Solo admin (maneja costos y márgenes).
 */
export default async function ProyectosAdmin() {
  await requireAdmin();
  const db = await getDB();
  return (
    <DashboardShell role="admin" title="Proyectos">
      <ProyectosManager
        proyectos={db.projects}
        budgets={db.budgets}
        totalConceptos={db.concepts.length}
      />
    </DashboardShell>
  );
}
