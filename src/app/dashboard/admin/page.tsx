import DashboardShell from "@/components/dashboard/DashboardShell";
import Link from "next/link";
import SolicitudesPendientes from "@/components/panel/SolicitudesPendientes";
import { requireAdmin } from "@/lib/auth-server";
import { getDB } from "@/lib/db";
import { Users, Package, UserCheck, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PanelAdmin() {
  await requireAdmin();
  const db = await getDB();

  const pendientes = db.materials.filter((m) => m.estado === "pendiente");
  const porAprobar = db.access.filter((a) => a.estado === "pendiente").length;

  const stats = [
    { label: "Empleados", value: db.employees.length, href: "/dashboard/admin/personal", icon: Users },
    { label: "Solicitudes pendientes", value: pendientes.length, href: "/dashboard/admin", icon: Package },
    { label: "Accesos por revisar", value: porAprobar, href: "/dashboard/admin/accesos", icon: UserCheck },
  ];

  return (
    <DashboardShell role="admin" title="Panel general">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
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
      <div>
        <h2 className="text-[#1B2A5E] text-lg mb-3" style={{ fontFamily: "var(--font-playfair)" }}>
          Solicitudes de material pendientes
        </h2>
        <SolicitudesPendientes initial={pendientes} />
      </div>
    </DashboardShell>
  );
}
