import Link from "next/link";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import GanttReadOnly from "@/components/proyectos/GanttReadOnly";
import { requireSession } from "@/lib/auth-server";
import { getDB } from "@/lib/db";
import { ChevronLeft, MapPin, Users, FolderOpen } from "lucide-react";

export const dynamic = "force-dynamic";

const ESTADO_CLS: Record<string, string> = {
  activo: "bg-green-50 text-green-700 border-green-200",
  finalizado: "bg-[#F5F2EC] text-[#7A7A7A] border-[#EDE9E0]",
  futuro: "bg-[#1B2A5E]/5 text-[#1B2A5E] border-[#1B2A5E]/20",
};

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
  const est = ESTADO_CLS[proyecto.estado] || "";

  return (
    <DashboardShell role="empleado" title={proyecto.nombre}>
      <Link href="/dashboard/empleado" className="flex items-center gap-1 text-sm text-[#7A7A7A] hover:text-[#1B2A5E] mb-4">
        <ChevronLeft size={16} /> Panel general
      </Link>

      <div className="bg-white border border-[#EDE9E0] p-5 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-[#1B2A5E] text-2xl" style={{ fontFamily: "var(--font-playfair)" }}>{proyecto.nombre}</h2>
            {proyecto.ubicacion && <p className="flex items-center gap-1 text-sm text-[#7A7A7A] mt-1"><MapPin size={13} /> {proyecto.ubicacion}</p>}
          </div>
          <span className={`text-xs px-2 py-1 border ${est}`}>{proyecto.estado}</span>
        </div>
        <div className="mt-4 h-1.5 bg-[#F5F2EC] overflow-hidden max-w-sm">
          <div className="h-full bg-[#C9A84C]" style={{ width: `${Math.min(100, Math.max(0, proyecto.avance))}%` }} />
        </div>
        <p className="text-xs text-[#7A7A7A] mt-1 data-label">{proyecto.avance}% avance</p>
        {proyecto.desc && <p className="text-sm text-[#555] mt-3">{proyecto.desc}</p>}
        {proyecto.carpetaInformes && (
          <p className="flex items-center gap-1.5 text-xs text-[#7A7A7A] mt-3">
            <FolderOpen size={13} className="text-[#C9A84C]" /> Informes: <span className="text-[#2C2C2C]">{proyecto.carpetaInformes}</span>
          </p>
        )}
      </div>

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
