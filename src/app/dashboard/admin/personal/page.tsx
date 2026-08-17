import DashboardShell from "@/components/dashboard/DashboardShell";
import PersonalManager from "@/components/personal/PersonalManager";
import { requireAdmin, credsOf } from "@/lib/auth-server";
import { getDB } from "@/lib/db";
import { seedInitialEmployees } from "@/lib/seed";
import { listDirectory } from "@/lib/webdav";
import { ensureSharedStructure, SHARED_ROOT } from "@/lib/shared-files";

export const dynamic = "force-dynamic";

export default async function PersonalAdmin() {
  const session = await requireAdmin();
  await seedInitialEmployees();
  await ensureSharedStructure(credsOf(session));
  const db = await getDB();

  // Subcarpetas de "Archivos compartidos" (para el control de visibilidad).
  let sharedFolders: string[] = [];
  try {
    const entries = await listDirectory(credsOf(session), SHARED_ROOT);
    sharedFolders = entries.filter((e) => e.isDir).map((e) => e.name);
  } catch {
    /* el NAS puede no responder; el control de visibilidad queda vacío */
  }

  return (
    <DashboardShell role="admin" title="Gestión de personal">
      <PersonalManager
        initial={db.employees}
        projects={db.projects.map((p) => ({ id: p.id, nombre: p.nombre }))}
        sharedFolders={sharedFolders}
      />
    </DashboardShell>
  );
}
