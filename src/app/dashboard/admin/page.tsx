import DashboardShell from "@/components/dashboard/DashboardShell";
import Link from "next/link";
import { Mail, FolderKanban, Users, Package, HardDrive, TrendingUp, AlertCircle } from "lucide-react";

const statsCards = [
  { icon: FolderKanban, label: "Proyectos activos", value: "4", sub: "2 con revisión pendiente", href: "/dashboard/admin/proyectos", color: "bg-[#1B2A5E]" },
  { icon: Users, label: "Personal activo", value: "23", sub: "3 sin asignación", href: "/dashboard/admin/personal", color: "bg-[#243470]" },
  { icon: Package, label: "Solicitudes material", value: "5", sub: "2 pendientes de aprobar", href: "/dashboard/admin/inventario", color: "bg-[#C9A84C]", textDark: true },
  { icon: Mail, label: "Correos sin leer", value: "5", sub: "2 urgentes", href: "/dashboard/admin/correo", color: "bg-[#EDE9E0]", textDark: true },
];

const proyectos = [
  { nombre: "Retablo Mayor — San Miguel", estado: "activo", avance: 65, empleados: 6 },
  { nombre: "Fachada Palacio de la Reforma", estado: "activo", avance: 40, empleados: 8 },
  { nombre: "Murales Ex-Convento", estado: "activo", avance: 90, empleados: 4 },
  { nombre: "Capilla Privada Querétaro", estado: "activo", avance: 15, empleados: 3 },
];

export default function AdminHome() {
  return (
    <DashboardShell role="admin" title="Panel de administración">
      {/* Welcome */}
      <div className="mb-8">
        <p className="text-[#7A7A7A] text-sm">
          Panel general · <span className="text-[#1B2A5E] font-semibold">Cobalto Barroco</span>
        </p>
        <div className="w-12 h-0.5 bg-[#C9A84C] mt-2" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statsCards.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.href} href={c.href}
              className={`${c.color} p-5 hover:opacity-90 transition-opacity`}
            >
              <Icon size={20} className={c.textDark ? "text-[#1B2A5E]" : "text-[#F5F2EC]/60"} />
              <p className={`text-3xl font-bold mt-3 mb-0.5 ${c.textDark ? "text-[#1B2A5E]" : "text-[#F5F2EC]"}`}
                style={{ fontFamily: "var(--font-playfair)" }}>
                {c.value}
              </p>
              <p className={`text-xs tracking-wider uppercase font-semibold ${c.textDark ? "text-[#1B2A5E]" : "text-[#F5F2EC]"}`}>{c.label}</p>
              <p className={`text-xs mt-1 ${c.textDark ? "text-[#7A7A7A]" : "text-[#F5F2EC]/50"}`}>{c.sub}</p>
            </Link>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Projects progress */}
        <div className="lg:col-span-2 bg-white border border-[#EDE9E0] p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[#1B2A5E] text-lg" style={{ fontFamily: "var(--font-playfair)" }}>
              Proyectos en curso
            </h3>
            <Link href="/dashboard/admin/proyectos" className="text-[#C9A84C] text-xs tracking-widest uppercase hover:underline">
              Ver todos
            </Link>
          </div>
          <div className="space-y-5">
            {proyectos.map((p) => (
              <div key={p.nombre}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[#2C2C2C] text-sm font-medium">{p.nombre}</span>
                  <span className="text-[#C9A84C] text-sm font-bold" style={{ fontFamily: "var(--font-playfair)" }}>
                    {p.avance}%
                  </span>
                </div>
                <div className="h-1.5 bg-[#EDE9E0]">
                  <div className="h-1.5 bg-gradient-to-r from-[#1B2A5E] to-[#C9A84C]"
                    style={{ width: `${p.avance}%` }} />
                </div>
                <p className="text-[#7A7A7A] text-xs mt-1">{p.empleados} restauradores asignados</p>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts */}
        <div className="bg-white border border-[#EDE9E0] p-6">
          <h3 className="text-[#1B2A5E] text-lg mb-5" style={{ fontFamily: "var(--font-playfair)" }}>
            Alertas
          </h3>
          <div className="space-y-3">
            {[
              { text: "2 solicitudes de material pendientes", type: "warn" },
              { text: "3 empleados sin proyecto asignado", type: "warn" },
              { text: "Murales Ex-Convento al 90% — revisión final próxima", type: "info" },
              { text: "5 correos sin responder", type: "alert" },
            ].map((a, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 text-sm ${
                a.type === "alert" ? "bg-red-50 border border-red-100" :
                a.type === "warn" ? "bg-amber-50 border border-amber-100" :
                "bg-blue-50 border border-blue-100"
              }`}>
                <AlertCircle size={14} className={`mt-0.5 shrink-0 ${
                  a.type === "alert" ? "text-red-400" :
                  a.type === "warn" ? "text-amber-500" : "text-blue-400"
                }`} />
                <span className="text-[#2C2C2C]">{a.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
