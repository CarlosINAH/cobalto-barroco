import DashboardShell from "@/components/dashboard/DashboardShell";
import Link from "next/link";
import { requireSession } from "@/lib/auth-server";
import { getDB } from "@/lib/db";
import { HardDrive, Share2, Settings, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PanelGeneralEmpleado() {
  const session = await requireSession();
  const db = await getDB();
  const emp = db.employees.find(
    (e) => e.username.toLowerCase() === session.username.toLowerCase(),
  );

  const accesos = [
    { label: "Nube personal", href: "/dashboard/empleado/repositorio", icon: HardDrive },
    { label: "Archivos Compartidos", href: "/dashboard/empleado/compartidos", icon: Share2 },
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
