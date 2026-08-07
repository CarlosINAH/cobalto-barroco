import DashboardShell from "@/components/dashboard/DashboardShell";
import Link from "next/link";
import { requireSession } from "@/lib/auth-server";
import { getDB } from "@/lib/db";
import { FolderOpen, Mail, HardDrive, Settings, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PanelGeneralEmpleado() {
  const session = await requireSession();
  const db = await getDB();
  const emp = db.employees.find(
    (e) => e.username.toLowerCase() === session.username.toLowerCase(),
  );
  const proyecto = emp?.proyectoId
    ? db.projects.find((p) => p.id === emp.proyectoId)
    : null;
  const unread = db.messages.filter(
    (m) =>
      m.toUsername.toLowerCase() === session.username.toLowerCase() && !m.leido,
  ).length;

  const accesos = [
    { label: "Mensajes", href: "/dashboard/empleado/correo", icon: Mail },
    { label: "Nube NAS", href: "/dashboard/empleado/repositorio", icon: HardDrive },
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

      {/* Proyecto asignado */}
      <div className="bg-white border border-[#EDE9E0] p-6 mb-6">
        <div className="flex items-center gap-2 text-[#7A7A7A] text-xs tracking-widest uppercase mb-3">
          <FolderOpen size={14} className="text-[#C9A84C]" /> Proyecto asignado
        </div>
        {proyecto ? (
          <Link href="/dashboard/empleado/proyecto" className="group block">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-[#1B2A5E] text-xl group-hover:text-[#C9A84C] transition-colors" style={{ fontFamily: "var(--font-playfair)" }}>
                  {proyecto.nombre}
                </h3>
                {proyecto.ubicacion && <p className="text-[#7A7A7A] text-sm mt-0.5">{proyecto.ubicacion}</p>}
              </div>
              <span className="text-[#C9A84C] text-2xl font-bold" style={{ fontFamily: "var(--font-playfair)" }}>
                {proyecto.avance}%
              </span>
            </div>
            <div className="mt-3 h-1 bg-[#EDE9E0]">
              <div className="h-1 bg-gradient-to-r from-[#1B2A5E] to-[#C9A84C]" style={{ width: `${proyecto.avance}%` }} />
            </div>
          </Link>
        ) : (
          <p className="text-[#7A7A7A] text-sm">Todavía no tienes un proyecto asignado.</p>
        )}
      </div>

      {/* Resumen */}
      <div className="grid gap-4 sm:grid-cols-2 mb-6">
        <div className="bg-white border border-[#EDE9E0] p-5">
          <p className="text-[#1B2A5E] text-3xl font-bold" style={{ fontFamily: "var(--font-playfair)" }}>
            {unread}
          </p>
          <p className="text-[#7A7A7A] text-xs uppercase tracking-wider mt-1">
            Mensajes sin leer
          </p>
        </div>
        <div className="bg-white border border-[#EDE9E0] p-5">
          <p className="text-[#1B2A5E] text-3xl font-bold" style={{ fontFamily: "var(--font-playfair)" }}>
            {proyecto ? `${proyecto.avance}%` : "—"}
          </p>
          <p className="text-[#7A7A7A] text-xs uppercase tracking-wider mt-1">
            Avance de tu proyecto
          </p>
        </div>
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
