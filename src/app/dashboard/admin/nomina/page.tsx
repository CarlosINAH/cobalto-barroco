import DashboardShell from "@/components/dashboard/DashboardShell";
import NominaManager from "@/components/nomina/NominaManager";
import { requireAdmin } from "@/lib/auth-server";
import { getDB } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Nómina de la empresa (hoja NÓMINA del Excel). Solo admin. */
export default async function NominaAdmin() {
  await requireAdmin();
  const db = await getDB();
  return (
    <DashboardShell role="admin" title="Nómina">
      <NominaManager
        initial={db.payrollEntries}
        empleados={db.employees.map((e) => ({ id: e.id, nombre: e.nombre }))}
        proyectos={db.projects.map((p) => ({ id: p.id, nombre: p.nombre }))}
      />
    </DashboardShell>
  );
}
