import DashboardShell from "@/components/dashboard/DashboardShell";
import FileBrowser from "@/components/files/FileBrowser";
import { requireAdmin } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export default async function NASAdmin() {
  await requireAdmin();

  return (
    <DashboardShell role="admin" title="Nube NAS">
      <div className="mb-5">
        <p className="text-[#7A7A7A] text-sm">
          Todos los archivos de la empresa: repositorios de empleados
          (<span className="font-medium">Empleados/</span>) y proyectos
          (<span className="font-medium">Proyectos/</span>).
        </p>
      </div>
      <FileBrowser rootLabel="NAS" />
    </DashboardShell>
  );
}
