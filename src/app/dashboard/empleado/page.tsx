import DashboardShell from "@/components/dashboard/DashboardShell";
import Link from "next/link";
import {
  Mail,
  FolderOpen,
  BookOpen,
  Star,
  MapPin,
  Package,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";

const cards = [
  {
    icon: Mail,
    label: "Bandeja de entrada",
    value: "3 sin leer",
    status: "alert",
    href: "/dashboard/empleado/correo",
    desc: "Tienes mensajes nuevos",
  },
  {
    icon: FolderOpen,
    label: "Proyecto asignado",
    value: "Retablo Mayor",
    status: "ok",
    href: "/dashboard/empleado/proyecto",
    desc: "En progreso · 65% completado",
  },
  {
    icon: BookOpen,
    label: "Repositorio",
    value: "12 archivos",
    status: "ok",
    href: "/dashboard/empleado/repositorio",
    desc: "Último upload: hace 2 días",
  },
  {
    icon: Star,
    label: "Mis habilidades",
    value: "8 registradas",
    status: "ok",
    href: "/dashboard/empleado/habilidades",
    desc: "Basadas en tu CV",
  },
  {
    icon: MapPin,
    label: "Asistencia",
    value: "Hoy: Pendiente",
    status: "warn",
    href: "/dashboard/empleado/asistencia",
    desc: "Registra tu entrada",
  },
  {
    icon: Package,
    label: "Solicitud de material",
    value: "1 en revisión",
    status: "warn",
    href: "/dashboard/empleado/materiales",
    desc: "Awaiting admin approval",
  },
];

const statusIcon = {
  ok: <CheckCircle2 size={14} className="text-emerald-500" />,
  warn: <Clock size={14} className="text-amber-500" />,
  alert: <AlertCircle size={14} className="text-red-400" />,
};

export default function EmpleadoHome() {
  return (
    <DashboardShell role="empleado" title="Mi panel">
      {/* Welcome */}
      <div className="mb-8">
        <p className="text-[#7A7A7A] text-sm">
          Bienvenido de vuelta,{" "}
          <span className="text-[#1B2A5E] font-semibold">Juan Pérez</span>
        </p>
        <div className="w-12 h-0.5 bg-[#C9A84C] mt-2" />
      </div>

      {/* Quick cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 mb-10">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.href}
              href={c.href}
              className="bg-white border border-[#EDE9E0] p-5 hover:border-[#C9A84C]/50 hover:shadow-sm transition-all duration-200 group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-[#1B2A5E]/5 flex items-center justify-center group-hover:bg-[#1B2A5E] transition-colors duration-200">
                  <Icon
                    size={18}
                    className="text-[#1B2A5E] group-hover:text-[#C9A84C] transition-colors duration-200"
                  />
                </div>
                {statusIcon[c.status as keyof typeof statusIcon]}
              </div>
              <p className="text-[#7A7A7A] text-xs tracking-wider uppercase mb-1">
                {c.label}
              </p>
              <p
                className="text-[#1B2A5E] text-lg font-semibold mb-1"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                {c.value}
              </p>
              <p className="text-[#7A7A7A] text-xs">{c.desc}</p>
            </Link>
          );
        })}
      </div>

      {/* Today's quick action - Attendance */}
      <div className="bg-[#1B2A5E] p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-[#C9A84C] text-xs tracking-widest uppercase mb-1 font-semibold">
            Acción rápida
          </p>
          <h2
            className="text-[#F5F2EC] text-xl"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Registra tu asistencia de hoy
          </h2>
          <p className="text-[#F5F2EC]/50 text-sm mt-1">
            Lunes 1 de junio · Se usará tu ubicación GPS
          </p>
        </div>
        <Link
          href="/dashboard/empleado/asistencia"
          className="bg-[#C9A84C] text-[#1B2A5E] px-6 py-3 text-xs tracking-widest uppercase font-bold hover:bg-[#D4B86A] transition-colors shrink-0"
        >
          Marcar entrada
        </Link>
      </div>
    </DashboardShell>
  );
}
