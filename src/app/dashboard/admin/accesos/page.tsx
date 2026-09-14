import DashboardShell from "@/components/dashboard/DashboardShell";
import AccesosManager from "@/components/accesos/AccesosManager";
import { requireAdmin } from "@/lib/auth-server";
import { listAccess } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function AccesosAdmin() {
  await requireAdmin();
  const access = await listAccess();
  return (
    <DashboardShell role="admin" title="Accesos">
      <AccesosManager initial={access} />
    </DashboardShell>
  );
}
