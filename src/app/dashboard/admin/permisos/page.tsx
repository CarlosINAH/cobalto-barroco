import DashboardShell from "@/components/dashboard/DashboardShell";
import PermisosManager from "@/components/permisos/PermisosManager";
import { requireAdmin, credsOf } from "@/lib/auth-server";
import { listDirectory } from "@/lib/webdav";
import {
  ensureSharedStructure,
  SHARED_ROOT,
  allFolderShares,
  employeeDirectory,
} from "@/lib/shared-files";

export const dynamic = "force-dynamic";

const norm = (p: string) => p.replace(/^\/+/, "").replace(/\/+$/, "");

export default async function PermisosAdmin() {
  const session = await requireAdmin();
  await ensureSharedStructure(credsOf(session));

  // Subcarpetas de "Archivos compartidos" (las que se pueden compartir).
  let folders: { name: string; path: string }[] = [];
  try {
    const entries = await listDirectory(credsOf(session), SHARED_ROOT);
    folders = entries
      .filter((e) => e.isDir)
      .map((e) => ({ name: e.name, path: e.path }));
  } catch {
    /* el NAS puede no responder; la lista queda vacía */
  }

  const [shares, employees] = await Promise.all([
    allFolderShares(),
    employeeDirectory(),
  ]);

  // null = visible para todos; array = solo esos usuarios.
  const initialShares: Record<string, string[] | null> = {};
  for (const f of folders) {
    const s = shares.find((x) => x.path === norm(f.path));
    initialShares[f.path] = s ? s.allowed : null;
  }

  return (
    <DashboardShell role="admin" title="Permisos de carpetas">
      <PermisosManager
        folders={folders}
        employees={employees}
        initialShares={initialShares}
      />
    </DashboardShell>
  );
}
