import Link from "next/link";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import GanttReadOnly from "@/components/proyectos/GanttReadOnly";
import ProyectoEmpleadoHeader from "@/components/proyectos/ProyectoEmpleadoHeader";
import { requireSession } from "@/lib/auth-server";
import { getDB } from "@/lib/db";
import { ChevronLeft, Users } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Detalle de proyecto para el empleado (solo lectura): información de la obra,
 * el equipo (participantes) y el cronograma. Solo accesible si el empleado está
 * involucrado en el proyecto.
 */
export default async function EmpleadoProyectoDetalle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const db = await getDB();
  const emp = db.employees.find((e) => e.username.toLowerCase() === session.username.toLowerCase());
  const misIds = emp?.proyectoIds?.length ? emp.proyectoIds : emp?.proyectoId ? [emp.proyectoId] : [];

  const proyecto = db.projects.find((p) => p.id === id);
  // Solo si participa (o es admin).
  if (!proyecto || (session.role !== "admin" && !misIds.includes(id))) redirect("/dashboard/empleado");

  const budget = db.budgets.find((b) => b.projectId === id) || null;
  const equipo = db.employees
    .filter((e) => (e.proyectoIds?.length ? e.proyectoIds : e.proyectoId ? [e.proyectoId] : []).includes(id))
    .map((e) => ({ id: e.id, nombre: e.nombre, rol: e.rol }));
  // Puede editar si es admin o administración lo marcó como editor del proyecto.
  const canEdit = session.role === "admin" || !!emp?.proyectoEdita?.includes(id);

  return (
    <DashboardShell role="empleado" title={proyecto.nombre}>
      <Link href="/dashboard/empleado" className="flex items-center gap-1 text-sm text-[#7A7A7A] hover:text-[#1B2A5E] mb-4">
        <ChevronLeft size={16} /> Panel general
      </Link>

      <ProyectoEmpleadoHeader
        proyecto={{
          id: proyecto.id, nombre: proyecto.nombre, ubicacion: proyecto.ubicacion,
          estado: proyecto.estado, avance: proyecto.avance, inicio: proyecto.inicio,
          entrega: proyecto.entrega, desc: proyecto.desc, carpetaInformes: proyecto.carpetaInformes,
        }}
        canEdit={canEdit}
      />

      <h3 className="text-[#1B2A5E] text-sm uppercase tracking-wider font-semibold mb-3 flex items-center gap-2">
        <Users size={15} className="text-[#C9A84C]" /> Equipo del proyecto
      </h3>
      <div className="bg-white border border-[#EDE9E0] mb-8 overflow-x-auto">
        <table className="w-full text-sm">
          <tbody>
            {equipo.map((e) => (
              <tr key={e.id} className="border-b border-[#F5F2EC] last:border-0">
                <td className="px-4 py-2.5 text-[#2C2C2C]">{e.nombre}</td>
                <td className="px-4 py-2.5 text-[#7A7A7A] text-right">{e.rol || "—"}</td>
              </tr>
            ))}
            {equipo.length === 0 && <tr><td className="px-4 py-6 text-center text-[#7A7A7A]">Sin participantes asignados.</td></tr>}
          </tbody>
        </table>
      </div>

      <h3 className="text-[#1B2A5E] text-sm uppercase tracking-wider font-semibold mb-3">Cronograma</h3>
      <GanttReadOnly budget={budget} />
    </DashboardShell>
  );
}
