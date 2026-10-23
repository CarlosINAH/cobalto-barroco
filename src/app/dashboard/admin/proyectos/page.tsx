import DashboardShell from "@/components/dashboard/DashboardShell";
import ProyectosManager from "@/components/proyectos/ProyectosManager";
import { requireAdmin } from "@/lib/auth-server";
import { getDB } from "@/lib/db";
import { buildCatalogs, conceptBreakdown } from "@/lib/pu";

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
  // Biblioteca de conceptos con su P.U. y desglose por tipo (para el balance).
  const conceptos = db.concepts.map((c) => {
    const b = conceptBreakdown(c, catalogs);
    return {
      id: c.id,
      clave: c.clave,
      concepto: c.concepto,
      descripcion: c.descripcion,
      unidad: c.unidad,
      pu: b.pu,
      tiempoPU: c.tiempoPU ?? null,
      porTipo: b.porTipo,
    };
  });
  return (
    <DashboardShell role="admin" title="Proyectos">
      <ProyectosManager
        proyectos={db.projects}
        budgets={db.budgets}
        conceptos={conceptos}
        ledger={db.ledgerEntries}
        payroll={db.payrollEntries}
      />
    </DashboardShell>
  );
}
