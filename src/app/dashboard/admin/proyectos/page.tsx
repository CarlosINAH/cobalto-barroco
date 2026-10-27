import DashboardShell from "@/components/dashboard/DashboardShell";
import ProyectosManager from "@/components/proyectos/ProyectosManager";
import { requireSectionView } from "@/lib/auth-server";
import { getDB } from "@/lib/db";
import { buildCatalogs, conceptBreakdown } from "@/lib/pu";

export const dynamic = "force-dynamic";

/**
 * Pestaña central del flujo de presupuestos. Acceso: admin, o quien tenga la
 * sección "proyectos" habilitada (lectura/total) en Configuración.
 */
export default async function ProyectosAdmin() {
  const session = await requireSectionView("proyectos");
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
    <DashboardShell role={session.role} title="Proyectos">
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
