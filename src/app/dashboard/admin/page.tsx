import DashboardShell from "@/components/dashboard/DashboardShell";
import Link from "next/link";
import SolicitudesPendientes from "@/components/panel/SolicitudesPendientes";
import { requireAdmin } from "@/lib/auth-server";
import { getDB } from "@/lib/db";
import { FolderKanban, Users, Package, Mail, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PanelAdmin() {
  await requireAdmin();
  const db = await getDB();

  const activos = db.projects.filter((p) => p.estado === "activo").length;
  const pendientes = db.materials.filter((m) => m.estado === "pendiente");

  const stats = [
    { label: "Proyectos activos", value: activos, href: "/dashboard/admin/proyectos", icon: FolderKanban },
    { label: "Empleados", value: db.employees.length, href: "/dashboard/admin/personal", icon: Users },
    { label: "Solicitudes pendientes", value: pendientes.length, href: "/dashboard/admin", icon: Package },
    { label: "Mensajes", value: db.messages.length, href: "/dashboard/admin/correo", icon: Mail },
  ];

  return (
    <DashboardShell role="admin" title="Panel general">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.label}
              href={s.href}
              className="bg-white border border-[#EDE9E0] p-5 hover:border-[#C9A84C]/50 transition-colors group"
            >
              <div className="flex items-center justify-between mb-2">
                <Icon size={18} className="text-[#C9A84C]" />
                <ArrowRight size={14} className="text-[#EDE9E0] group-hover:text-[#C9A84C]" />
              </div>
              <p className="text-[#1B2A5E] text-3xl font-bold" style={{ fontFamily: "var(--font-playfair)" }}>
                {s.value}
              </p>
              <p className="text-[#7A7A7A] text-xs uppercase tracking-wider mt-1">{s.label}</p>
            </Link>
          );
        })}
      </div>

      {/* Solicitudes pendientes */}
      <div className="mb-8">
        <h2 className="text-[#1B2A5E] text-lg mb-3" style={{ fontFamily: "var(--font-playfair)" }}>
          Solicitudes de material pendientes
        </h2>
        <SolicitudesPendientes initial={pendientes} />
      </div>

      {/* Proyectos en curso */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[#1B2A5E] text-lg" style={{ fontFamily: "var(--font-playfair)" }}>
            Proyectos en curso
          </h2>
          <Link href="/dashboard/admin/proyectos" className="text-[#C9A84C] text-xs hover:underline">
            Ver todos
          </Link>
        </div>
        {db.projects.filter((p) => p.estado === "activo").length === 0 ? (
          <div className="bg-white border border-[#EDE9E0] py-10 text-center text-[#7A7A7A] text-sm">
            No hay proyectos activos.
          </div>
        ) : (
          <div className="space-y-3">
            {db.projects
              .filter((p) => p.estado === "activo")
              .map((p) => (
                <div key={p.id} className="bg-white border border-[#EDE9E0] p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[#1B2A5E] font-medium truncate">{p.nombre}</p>
                      <p className="text-[#7A7A7A] text-xs">
                        {db.employees.filter((e) => e.proyectoId === p.id).length} asignados
                        {p.ubicacion ? ` · ${p.ubicacion}` : ""}
                      </p>
                    </div>
                    <span className="text-[#C9A84C] font-bold shrink-0" style={{ fontFamily: "var(--font-playfair)" }}>
                      {p.avance}%
                    </span>
                  </div>
                  <div className="mt-3 h-1 bg-[#EDE9E0]">
                    <div className="h-1 bg-gradient-to-r from-[#1B2A5E] to-[#C9A84C]" style={{ width: `${p.avance}%` }} />
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
