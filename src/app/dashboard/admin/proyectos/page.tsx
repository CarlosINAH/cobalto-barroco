import DashboardShell from "@/components/dashboard/DashboardShell";
import ProyectosManager from "@/components/proyectos/ProyectosManager";
import { requireAdmin } from "@/lib/auth-server";
import { getDB } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ProyectosAdmin() {
  await requireAdmin();
  const db = await getDB();
  return (
    <DashboardShell role="admin" title="Proyectos">
      <ProyectosManager initial={db.projects} />
    </DashboardShell>
  );
}
