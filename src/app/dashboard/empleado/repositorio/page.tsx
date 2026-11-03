import DashboardShell from "@/components/dashboard/DashboardShell";
import DriveWorkspace from "@/components/drive/DriveWorkspace";
import { requireSession } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

/** Archivos del equipo: la carpeta única de trabajo en el Drive central. */
export default async function ArchivosEmpleado() {
  await requireSession();
  return (
    <DashboardShell role="empleado" title="Archivos">
      <p className="text-[#7A7A7A] text-sm mb-4">
        Carpeta de trabajo del equipo (Google Drive). Lo que puedes hacer depende de tu rol.
      </p>
      <DriveWorkspace />
    </DashboardShell>
  );
}
