import DashboardShell from "@/components/dashboard/DashboardShell";
import EmpleadoProyectos from "@/components/empleado/EmpleadoProyectos";
import { requireSession } from "@/lib/auth-server";
import { getDB } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Proyectos para empleados: pueden registrarlos y agregar recetas como gasto.
 * NO se exponen montos de dinero del proyecto (eso es solo administración).
 */
export default async function ProyectosEmpleado() {
  await requireSession();
  const db = await getDB();
  // Solo campos no sensibles (sin montos).
  const proyectos = db.projects.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    ubicacion: p.ubicacion,
    estado: p.estado,
  }));
  const recetas = db.recipes.map((r) => ({
    id: r.id,
    nombre: r.nombre,
    unidad: r.unidad,
    rendimiento: r.rendimiento,
  }));
  return (
    <DashboardShell role="empleado" title="Proyectos">
      <EmpleadoProyectos proyectos={proyectos} recetas={recetas} />
    </DashboardShell>
  );
}
