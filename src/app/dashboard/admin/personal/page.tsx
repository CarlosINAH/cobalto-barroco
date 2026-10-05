import DashboardShell from "@/components/dashboard/DashboardShell";
import PersonalYPermisos from "@/components/personal/PersonalYPermisos";
import { requireAdmin, credsOf } from "@/lib/auth-server";
import type { FolderPermLevel } from "@/lib/db";
import { getDB } from "@/lib/db";
import { seedInitialEmployees } from "@/lib/seed";
import { listDirectory } from "@/lib/webdav";
import {
  ensureSharedStructure,
  SHARED_ROOT,
  allFolderShares,
  employeeDirectory,
  permOf,
} from "@/lib/shared-files";
import { isInTrash } from "@/lib/trash";
import type { FolderPerms } from "@/components/permisos/PermisosManager";

export const dynamic = "force-dynamic";

const norm = (p: string) => p.replace(/^\/+/, "").replace(/\/+$/, "");

export default async function PersonalAdmin() {
  const session = await requireAdmin();
  await seedInitialEmployees();
  await ensureSharedStructure(credsOf(session));
  const db = await getDB();

  // Subcarpetas de "Archivos compartidos" (una sola lectura del NAS).
  let entries: { name: string; path: string; isDir: boolean }[] = [];
  try {
    entries = await listDirectory(credsOf(session), SHARED_ROOT);
  } catch {
    /* el NAS puede no responder */
  }
  const dirs = entries.filter((e) => e.isDir && !isInTrash(e.path));
  const folders = dirs.map((e) => ({ name: e.name, path: e.path }));

  // Permisos actuales por carpeta (para la pestaña de permisos).
  const [shares, employees] = await Promise.all([
    allFolderShares(),
    employeeDirectory(),
  ]);
  const initialPerms: Record<string, FolderPerms> = {};
  for (const f of folders) {
    const s = shares.find((x) => x.path === norm(f.path));
    const levels: Record<string, FolderPermLevel> = {};
    for (const e of employees) {
      levels[e.username] = permOf(s, e.username, "empleado");
    }
    initialPerms[f.path] = {
      levels,
      defaultPerm: s?.defaultPerm ?? "escritura",
      owner: s?.sharedBy ?? null,
    };
  }

  return (
    <DashboardShell role="admin" title="Personal y permisos">
      <PersonalYPermisos
        personal={{
          initial: db.employees,
          projects: db.projects.map((p) => ({ id: p.id, nombre: p.nombre })),
        }}
        permisos={{ folders, employees, initial: initialPerms }}
      />
    </DashboardShell>
  );
}
