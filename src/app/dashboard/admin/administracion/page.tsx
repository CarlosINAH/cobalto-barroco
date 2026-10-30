import DashboardShell from "@/components/dashboard/DashboardShell";
import AdministracionManager from "@/components/administracion/AdministracionManager";
import { requireSectionView, canWriteSection } from "@/lib/auth-server";
import { getDB } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Administración de obras (hoja OBRAS del Excel). Acceso: admin, o quien tenga
 * la sección "administración" habilitada (lectura/total) en Configuración.
 */
export default async function AdministracionAdmin() {
  const session = await requireSectionView("administracion");
  const db = await getDB();
  const canEditPago = await canWriteSection(session, "administracion");
  return (
    <DashboardShell role={session.role} title="Administración">
      <AdministracionManager
        projects={db.projects}
        ledger={db.ledgerEntries}
        payroll={db.payrollEntries}
        proximoPago={db.proximoPago ?? null}
        canEditPago={canEditPago}
      />
    </DashboardShell>
  );
}
