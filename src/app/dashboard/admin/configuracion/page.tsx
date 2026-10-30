import DashboardShell from "@/components/dashboard/DashboardShell";
import ConfiguracionManager from "@/components/configuracion/ConfiguracionManager";
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

/**
 * Centro de configuración (solo admin): accesos a secciones por persona,
 * empleados y permisos de carpetas, todo en un mismo lugar.
 */
export default async function ConfiguracionAdmin() {
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
  const folders = entries
    .filter((e) => e.isDir && !isInTrash(e.path))
    .map((e) => ({ name: e.name, path: e.path }));

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
      hidden: s?.hidden ?? true,
      owner: s?.sharedBy ?? null,
    };
  }

  return (
    <DashboardShell role="admin" title="Configuración">
      <ConfiguracionManager
        accesos={db.employees}
        personal={{
          initial: db.employees,
          projects: db.projects.map((p) => ({ id: p.id, nombre: p.nombre })),
        }}
        folders={folders}
        folderPerms={initialPerms}
        projects={db.projects.map((p) => ({ id: p.id, nombre: p.nombre }))}
      />
    </DashboardShell>
  );
}
