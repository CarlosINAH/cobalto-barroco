import DashboardShell from "@/components/dashboard/DashboardShell";
import NasArchivos from "@/components/nas/NasArchivos";
import { requireSession } from "@/lib/auth-server";
import { sessionProjectFolders } from "@/lib/shared-files";

export const dynamic = "force-dynamic";

/**
 * Archivos para empleados: carpetas compartidas de sus proyectos asignados.
 * Solo ven la subcarpeta "compartido" de cada proyecto.
 */
export default async function ArchivosEmpleado() {
  const session = await requireSession();
  const proyectos = await sessionProjectFolders(session);
  const role = session.role === "admin" ? "admin" : "empleado";
  return (
    <DashboardShell role="empleado" title="Archivos">
      <NasArchivos role={role} proyectos={proyectos} />
    </DashboardShell>
  );
}
