import DashboardShell from "@/components/dashboard/DashboardShell";
import ConstanciasManager from "@/components/constancias/ConstanciasManager";
import { requireAdmin } from "@/lib/auth-server";
import { getDB } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Emisión de constancias de trabajo (solo admin). */
export default async function ConstanciasAdmin() {
  const session = await requireAdmin();
  const db = await getDB();
  const me = db.employees.find(
    (e) => e.username.toLowerCase() === session.username.toLowerCase(),
  );
  return (
    <DashboardShell role="admin" title="Constancias">
      <ConstanciasManager
        empleados={db.employees.map((e) => ({ id: e.id, nombre: e.nombre }))}
        proyectos={db.projects.map((p) => ({
          id: p.id,
          nombre: p.nombre,
          ubicacion: p.ubicacion,
          inicio: p.inicio,
          entrega: p.entrega,
        }))}
        firmanteDefault={me?.nombre ?? ""}
      />
    </DashboardShell>
  );
}
