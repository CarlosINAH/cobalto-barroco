import DashboardShell from "@/components/dashboard/DashboardShell";
import PapeleraManager from "@/components/papelera/PapeleraManager";
import { requireAdmin } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export default async function PapeleraAdmin() {
  await requireAdmin();
  return (
    <DashboardShell role="admin" title="Papelera de reciclaje">
      <PapeleraManager role="admin" />
    </DashboardShell>
  );
}
