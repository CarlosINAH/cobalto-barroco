import DashboardShell from "@/components/dashboard/DashboardShell";
import FileBrowser from "@/components/files/FileBrowser";
import { requireAdmin, credsOf } from "@/lib/auth-server";
import { ensureSharedStructure, SHARED_ROOT } from "@/lib/shared-files";

export const dynamic = "force-dynamic";

export default async function CompartidosAdmin() {
  const session = await requireAdmin();
  // Crea "Archivos Compartidos/{Archivos,Fotos}" si aún no existe en el NAS.
  await ensureSharedStructure(credsOf(session));

  return (
    <DashboardShell role="admin" title="Archivos Compartidos">
      <div className="mb-5">
        <p className="text-[#7A7A7A] text-sm">
          Carpeta común entre empleados y administradores
          (<span className="font-medium">Archivos/</span> y
          {" "}<span className="font-medium">Fotos/</span>). Cada archivo guarda
          quién lo subió, cuándo, y su historial de cambios.
        </p>
      </div>
      <FileBrowser rootLabel="Compartidos" basePath={SHARED_ROOT} withMeta />
    </DashboardShell>
  );
}
