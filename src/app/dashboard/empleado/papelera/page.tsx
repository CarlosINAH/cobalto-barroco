import DashboardShell from "@/components/dashboard/DashboardShell";
import PapeleraManager from "@/components/papelera/PapeleraManager";
import { requireSession } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export default async function PapeleraEmpleado() {
  await requireSession();
  return (
    <DashboardShell role="empleado" title="Papelera de reciclaje">
      <PapeleraManager role="empleado" />
    </DashboardShell>
  );
}
