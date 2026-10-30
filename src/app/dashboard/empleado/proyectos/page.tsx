import DashboardShell from "@/components/dashboard/DashboardShell";
import EmpleadoProyectos from "@/components/empleado/EmpleadoProyectos";
import { requireSession } from "@/lib/auth-server";
import { getDB } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Proyectos para empleados: ven los proyectos que la administración les asigna
 * y pueden agregar recetas como gasto. NO se exponen montos de dinero del
 * proyecto (eso es solo administración) ni pueden crear proyectos.
 */
export default async function ProyectosEmpleado() {
  const session = await requireSession();
  const db = await getDB();
  // Solo los proyectos en los que la persona participa (asignados por
  // administración). El admin ve todos.
  const emp = db.employees.find(
    (e) => e.username.toLowerCase() === session.username.toLowerCase(),
  );
  const misIds = emp?.proyectoIds?.length ? emp.proyectoIds : emp?.proyectoId ? [emp.proyectoId] : [];
  const visibles = session.role === "admin" ? db.projects : db.projects.filter((p) => misIds.includes(p.id));
  // Solo campos no sensibles (sin montos).
  const proyectos = visibles.map((p) => ({
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
