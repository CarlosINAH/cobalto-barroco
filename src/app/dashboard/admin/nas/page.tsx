import DashboardShell from "@/components/dashboard/DashboardShell";
import NasArchivos from "@/components/nas/NasArchivos";
import { requireAdmin } from "@/lib/auth-server";
import { sessionProjectFolders } from "@/lib/shared-files";

export const dynamic = "force-dynamic";

/** Archivos del equipo: carpetas de proyectos en el NAS (acceso completo admin). */
export default async function ArchivosAdmin() {
  const session = await requireAdmin();
  const proyectos = await sessionProjectFolders(session);
  return (
    <DashboardShell role="admin" title="Archivos">
      <NasArchivos role="admin" proyectos={proyectos} />
    </DashboardShell>
  );
}
