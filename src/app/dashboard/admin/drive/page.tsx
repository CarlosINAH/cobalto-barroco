import DashboardShell from "@/components/dashboard/DashboardShell";
import DriveExplorer from "@/components/drive/DriveExplorer";
import { requireAdmin } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

/** Drive central de la empresa (solo administración). */
export default async function DriveAdmin() {
  await requireAdmin();
  return (
    <DashboardShell role="admin" title="Drive">
      <div className="mb-5">
        <p className="text-[#7A7A7A] text-sm">
          Gestiona el Drive central de Cobalto Barroco: navega, sube y organiza archivos.
        </p>
      </div>
      <DriveExplorer />
    </DashboardShell>
  );
}
