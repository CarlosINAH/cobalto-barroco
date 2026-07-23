import DashboardShell from "@/components/dashboard/DashboardShell";
import { MapPin, Calendar, Users, CheckCircle2, Clock, Circle } from "lucide-react";

const tareas = [
  { text: "Diagnóstico y documentación fotográfica", done: true },
  { text: "Limpieza superficial de capas de suciedad", done: true },
  { text: "Consolidación de estratos pictóricos", done: true },
  { text: "Reintegración de faltantes de soporte", done: false, active: true },
  { text: "Reintegración cromática", done: false },
  { text: "Barnizado de protección final", done: false },
  { text: "Documentación final y entrega", done: false },
];

export default function ProyectoEmpleado() {
  const completadas = tareas.filter((t) => t.done).length;
  const pct = Math.round((completadas / tareas.length) * 100);

  return (
    <DashboardShell role="empleado" title="Proyecto asignado">
      {/* Header card */}
      <div className="bg-[#1B2A5E] p-6 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[#C9A84C] text-xs tracking-widest uppercase mb-1 font-semibold">
              Proyecto activo
            </p>
            <h2
              className="text-[#F5F2EC] text-2xl mb-2"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              Retablo Mayor — Parroquia de San Miguel
            </h2>
            <div className="flex flex-wrap gap-4 text-[#F5F2EC]/60 text-sm">
              <span className="flex items-center gap-1.5">
                <MapPin size={13} /> Oaxaca, México
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar size={13} /> Inicio: 12 Ene 2025
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar size={13} /> Entrega: 30 Jul 2025
              </span>
              <span className="flex items-center gap-1.5">
                <Users size={13} /> 6 restauradores
              </span>
            </div>
          </div>
          <div className="text-center">
            <div
              className="text-[#C9A84C] text-4xl font-bold"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              {pct}%
            </div>
            <p className="text-[#F5F2EC]/50 text-xs uppercase tracking-wider">Avance</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-5 bg-[#F5F2EC]/10 h-2">
          <div
            className="bg-[#C9A84C] h-2 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Task list */}
        <div className="bg-white border border-[#EDE9E0] p-6">
          <h3
            className="text-[#1B2A5E] text-lg mb-5"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Etapas del proyecto
          </h3>
          <ul className="space-y-3">
            {tareas.map((t, i) => (
              <li key={i} className="flex items-start gap-3">
                {t.done ? (
                  <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                ) : t.active ? (
                  <Clock size={16} className="text-[#C9A84C] mt-0.5 shrink-0 animate-pulse" />
                ) : (
                  <Circle size={16} className="text-[#EDE9E0] mt-0.5 shrink-0" />
                )}
                <span
                  className={`text-sm ${
                    t.done
                      ? "text-[#7A7A7A] line-through"
                      : t.active
                      ? "text-[#1B2A5E] font-semibold"
                      : "text-[#7A7A7A]"
                  }`}
                >
                  {t.text}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Info lateral */}
        <div className="space-y-5">
          {/* Descripción */}
          <div className="bg-white border border-[#EDE9E0] p-6">
            <h3
              className="text-[#1B2A5E] text-lg mb-3"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              Descripción
            </h3>
            <p className="text-[#7A7A7A] text-sm leading-relaxed">
              Restauración integral de retablo barroco policromado del siglo XVIII.
              Incluye consolidación de dorado original, limpieza de barnices
              oxidados, reintegración de faltantes en estuco y reintegración
              cromática en zonas de pérdida pictórica.
            </p>
          </div>

          {/* Tu rol */}
          <div className="bg-white border border-[#EDE9E0] p-6">
            <h3
              className="text-[#1B2A5E] text-lg mb-3"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              Tu rol en este proyecto
            </h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#1B2A5E] flex items-center justify-center">
                <span className="text-[#C9A84C] text-xs font-bold">JP</span>
              </div>
              <div>
                <p className="text-[#2C2C2C] text-sm font-semibold">Juan Pérez</p>
                <p className="text-[#C9A84C] text-xs tracking-wide">
                  Especialista en dorado — Líder de etapa
                </p>
              </div>
            </div>
          </div>

          {/* Próxima revisión */}
          <div className="bg-[#EDE9E0] border border-[#C9A84C]/30 p-5">
            <p className="text-[#C9A84C] text-xs tracking-widest uppercase font-semibold mb-1">
              Próxima revisión
            </p>
            <p
              className="text-[#1B2A5E] text-lg"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              Viernes 6 de junio
            </p>
            <p className="text-[#7A7A7A] text-xs mt-1">
              Revisión de avance con cliente — 10:00 hrs
            </p>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
