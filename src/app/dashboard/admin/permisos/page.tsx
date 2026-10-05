import DashboardShell from "@/components/dashboard/DashboardShell";
import PermisosManager from "@/components/permisos/PermisosManager";
import { requireAdmin, credsOf } from "@/lib/auth-server";
import type { FolderPermLevel } from "@/lib/db";
import { listDirectory } from "@/lib/webdav";
import {
  ensureSharedStructure,
  SHARED_ROOT,
  allFolderShares,
  employeeDirectory,
  permOf,
} from "@/lib/shared-files";
import { isInTrash } from "@/lib/trash";

export const dynamic = "force-dynamic";

const norm = (p: string) => p.replace(/^\/+/, "").replace(/\/+$/, "");

export interface FolderPerms {
  levels: Record<string, FolderPermLevel>;
  defaultPerm: FolderPermLevel;
  owner: string | null;
}

export default async function PermisosAdmin() {
  const session = await requireAdmin();
  await ensureSharedStructure(credsOf(session));

  // Subcarpetas de "Archivos compartidos" (las que se administran).
  let folders: { name: string; path: string }[] = [];
  try {
    const entries = await listDirectory(credsOf(session), SHARED_ROOT);
    folders = entries
      .filter((e) => e.isDir && !isInTrash(e.path))
      .map((e) => ({ name: e.name, path: e.path }));
  } catch {
    /* el NAS puede no responder; la lista queda vacía */
  }

  const [shares, employees] = await Promise.all([
    allFolderShares(),
    employeeDirectory(),
  ]);

  // Nivel efectivo actual de cada empleado por carpeta (para prellenar).
  const initial: Record<string, FolderPerms> = {};
  for (const f of folders) {
    const s = shares.find((x) => x.path === norm(f.path));
    const levels: Record<string, FolderPermLevel> = {};
    for (const e of employees) {
      levels[e.username] = permOf(s, e.username, "empleado");
    }
    initial[f.path] = {
      levels,
      defaultPerm: s?.defaultPerm ?? "escritura",
      owner: s?.sharedBy ?? null,
    };
  }

  return (
    <DashboardShell role="admin" title="Permisos de carpetas">
      <PermisosManager
        folders={folders}
        employees={employees}
        initial={initial}
      />
    </DashboardShell>
  );
}
