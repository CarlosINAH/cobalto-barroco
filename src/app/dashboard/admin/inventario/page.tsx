import DashboardShell from "@/components/dashboard/DashboardShell";
import InventarioManager from "@/components/inventario/InventarioManager";
import { requireAdmin } from "@/lib/auth-server";
import { getDB } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function InventarioAdmin() {
  await requireAdmin();
  const db = await getDB();
  return (
    <DashboardShell role="admin" title="Inventario">
      <InventarioManager initial={db.inventory} />
    </DashboardShell>
  );
}
