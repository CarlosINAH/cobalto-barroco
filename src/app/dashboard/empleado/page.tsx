import DashboardShell from "@/components/dashboard/DashboardShell";
import Link from "next/link";
import { requireSession } from "@/lib/auth-server";
import { getDB } from "@/lib/db";
import { HardDrive, Share2, Settings, ArrowRight, FolderKanban, MapPin } from "lucide-react";

export const dynamic = "force-dynamic";

const ESTADO_CLS: Record<string, string> = {
  activo: "bg-green-50 text-green-700 border-green-200",
  finalizado: "bg-[#F5F2EC] text-[#7A7A7A] border-[#EDE9E0]",
  futuro: "bg-[#1B2A5E]/5 text-[#1B2A5E] border-[#1B2A5E]/20",
};

export default async function PanelGeneralEmpleado() {
  const session = await requireSession();
  const db = await getDB();
  const emp = db.employees.find(
    (e) => e.username.toLowerCase() === session.username.toLowerCase(),
  );

  // Proyectos en los que participa (varios; respaldo al proyecto principal).
  const misIds = emp?.proyectoIds?.length
    ? emp.proyectoIds
    : emp?.proyectoId
      ? [emp.proyectoId]
      : [];
  const misProyectos = db.projects.filter((p) => misIds.includes(p.id));

  const accesos = [
    { label: "Nube", href: "/dashboard/empleado/repositorio", icon: HardDrive },
    { label: "Archivos compartidos", href: "/dashboard/empleado/repositorio?tab=compartidos", icon: Share2 },
    { label: "Configuración", href: "/dashboard/empleado/configuracion", icon: Settings },
  ];

  return (
    <DashboardShell role="empleado" title="Panel general">
      <div className="mb-6">
        <h2 className="text-[#1B2A5E] text-2xl" style={{ fontFamily: "var(--font-playfair)" }}>
          Hola, {emp?.nombre || session.username}
        </h2>
        <p className="text-[#7A7A7A] text-sm mt-1">
          {emp?.rol || "Bienvenido a tu espacio de trabajo."}
        </p>
      </div>

      {/* Mis proyectos: obras en las que participa el empleado. */}
      <div className="mb-8">
        <h3 className="text-[#1B2A5E] text-sm uppercase tracking-wider font-semibold mb-3 flex items-center gap-2">
          <FolderKanban size={15} className="text-[#C9A84C]" /> Mis proyectos
        </h3>
        {misProyectos.length === 0 ? (
          <div className="bg-white border border-[#EDE9E0] p-5 text-sm text-[#7A7A7A]">
            Aún no tienes proyectos asignados. Cuando administración te agregue como
            participante de una obra, aparecerá aquí.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {misProyectos.map((p) => (
              <div key={p.id} className="bg-white border border-[#EDE9E0] p-4 flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-[#1B2A5E] font-semibold text-sm leading-tight" style={{ fontFamily: "var(--font-playfair)" }}>{p.nombre}</p>
                  <span className={`text-[11px] px-2 py-0.5 border shrink-0 ${ESTADO_CLS[p.estado] || ""}`}>{p.estado}</span>
                </div>
                {p.ubicacion && <p className="flex items-center gap-1 text-[#7A7A7A] text-xs"><MapPin size={11} /> {p.ubicacion}</p>}
                {emp?.rol && <p className="text-[#7A7A7A] text-xs mt-1">Tu rol: <span className="text-[#2C2C2C]">{emp.rol}</span></p>}
                <div className="mt-3 h-1.5 bg-[#F5F2EC] overflow-hidden">
                  <div className="h-full bg-[#C9A84C]" style={{ width: `${Math.min(100, Math.max(0, p.avance))}%` }} />
                </div>
                <p className="text-[11px] text-[#7A7A7A] mt-1 data-label">{p.avance}% avance</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Accesos rápidos */}
      <div className="grid gap-3 sm:grid-cols-3">
        {accesos.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.href}
              href={a.href}
              className="bg-white border border-[#EDE9E0] p-4 flex items-center gap-3 hover:border-[#C9A84C]/50 transition-colors group"
            >
              <Icon size={18} className="text-[#C9A84C]" />
              <span className="text-[#2C2C2C] text-sm flex-1">{a.label}</span>
              <ArrowRight size={14} className="text-[#EDE9E0] group-hover:text-[#C9A84C]" />
            </Link>
          );
        })}
      </div>
    </DashboardShell>
  );
}
