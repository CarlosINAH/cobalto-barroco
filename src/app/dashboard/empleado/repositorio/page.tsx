import DashboardShell from "@/components/dashboard/DashboardShell";
import FileBrowser from "@/components/files/FileBrowser";
import { requireSession } from "@/lib/auth-server";
import { ensureBase } from "@/lib/files";

export const dynamic = "force-dynamic";

export default async function RepositorioEmpleado() {
  const session = await requireSession();
  // Garantiza que exista la carpeta personal del empleado.
  await ensureBase(session);

  return (
    <DashboardShell role="empleado" title="Mi repositorio">
      <div className="mb-5">
        <p className="text-[#7A7A7A] text-sm">
          Tus archivos personales, {session.username}. Solo tú y la
          administración pueden verlos.
        </p>
      </div>
      <FileBrowser rootLabel="Mi repositorio" />
    </DashboardShell>
  );
}
