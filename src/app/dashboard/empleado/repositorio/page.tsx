import DashboardShell from "@/components/dashboard/DashboardShell";
import FileBrowser from "@/components/files/FileBrowser";
import { requireSession } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export default async function RepositorioEmpleado() {
  const session = await requireSession();

  return (
    <DashboardShell role="empleado" title="Nube NAS">
      <div className="mb-5">
        <p className="text-[#7A7A7A] text-sm">
          Tu carpeta personal en el NAS, {session.username}. Solo ves y gestionas
          lo que el NAS te permite.
        </p>
      </div>
      <FileBrowser rootLabel="Mi carpeta" />
    </DashboardShell>
  );
}
