import DashboardShell from "@/components/dashboard/DashboardShell";
import DriveWorkspace from "@/components/drive/DriveWorkspace";
import { requireAdmin } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

/** Archivos del equipo: la carpeta única de trabajo en el Drive central. */
export default async function ArchivosAdmin() {
  await requireAdmin();
  return (
    <DashboardShell role="admin" title="Archivos">
      <p className="text-[#7A7A7A] text-sm mb-4">
        Carpeta de trabajo del equipo (Google Drive). Todos ven esta carpeta; las acciones dependen del rol.
      </p>
      <DriveWorkspace />
    </DashboardShell>
  );
}
