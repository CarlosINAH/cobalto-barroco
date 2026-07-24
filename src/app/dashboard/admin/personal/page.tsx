import DashboardShell from "@/components/dashboard/DashboardShell";
import PersonalManager from "@/components/personal/PersonalManager";
import { requireAdmin } from "@/lib/auth-server";
import { getDB } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PersonalAdmin() {
  await requireAdmin();
  const db = await getDB();
  return (
    <DashboardShell role="admin" title="Gestión de personal">
      <PersonalManager
        initial={db.employees}
        projects={db.projects.map((p) => ({ id: p.id, nombre: p.nombre }))}
      />
    </DashboardShell>
  );
}
