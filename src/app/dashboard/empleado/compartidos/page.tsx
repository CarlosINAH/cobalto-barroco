import DashboardShell from "@/components/dashboard/DashboardShell";
import FileBrowser from "@/components/files/FileBrowser";
import { requireSession } from "@/lib/auth-server";
import { SHARED_ROOT } from "@/lib/shared-files";

export const dynamic = "force-dynamic";

export default async function CompartidosEmpleado() {
  await requireSession();

  return (
    <DashboardShell role="empleado" title="Archivos Compartidos">
      <div className="mb-5">
        <p className="text-[#7A7A7A] text-sm">
          Carpeta compartida con los administradores. Sube tus archivos en
          {" "}<span className="font-medium">Archivos/</span> y tus imágenes en
          {" "}<span className="font-medium">Fotos/</span>. Se registra quién sube
          cada archivo y su historial.
        </p>
      </div>
      <FileBrowser rootLabel="Compartidos" basePath={SHARED_ROOT} withMeta />
    </DashboardShell>
  );
}
