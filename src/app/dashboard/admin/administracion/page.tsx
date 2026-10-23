import DashboardShell from "@/components/dashboard/DashboardShell";
import AdministracionManager from "@/components/administracion/AdministracionManager";
import { requireAdmin } from "@/lib/auth-server";
import { getDB } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Administración de obras (hoja OBRAS del Excel). SOLO ADMIN: maneja montos de
 * dinero (contratado, anticipo, egresos, utilidad).
 */
export default async function AdministracionAdmin() {
  await requireAdmin();
  const db = await getDB();
  return (
    <DashboardShell role="admin" title="Administración">
      <AdministracionManager initial={db.projects} />
    </DashboardShell>
  );
}
