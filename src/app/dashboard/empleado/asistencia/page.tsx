"use client";

import DashboardShell from "@/components/dashboard/DashboardShell";
import { MapPin, CheckCircle2, Clock, XCircle } from "lucide-react";
import { useState } from "react";

const historial = [
  { fecha: "Vie 30 May", entrada: "08:52", salida: "17:10", estado: "ok" },
  { fecha: "Jue 29 May", entrada: "09:01", salida: "17:05", estado: "ok" },
  { fecha: "Mié 28 May", entrada: "—", salida: "—", estado: "falta" },
  { fecha: "Mar 27 May", entrada: "08:48", salida: "17:15", estado: "ok" },
  { fecha: "Lun 26 May", entrada: "09:15", salida: "17:00", estado: "tarde" },
  { fecha: "Vie 23 May", entrada: "08:55", salida: "17:10", estado: "ok" },
  { fecha: "Jue 22 May", entrada: "08:50", salida: "17:08", estado: "ok" },
];

const estadoIcon = {
  ok: <CheckCircle2 size={14} className="text-emerald-500" />,
  tarde: <Clock size={14} className="text-amber-500" />,
  falta: <XCircle size={14} className="text-red-400" />,
};

const estadoLabel = {
  ok: "A tiempo",
  tarde: "Tarde",
  falta: "Falta",
};

export default function AsistenciaEmpleado() {
  const [registrado, setRegistrado] = useState(false);

  return (
    <DashboardShell role="empleado" title="Asistencia">
      {/* Quick register card */}
      <div className="bg-[#1B2A5E] p-8 mb-6 text-center">
        <p className="text-[#C9A84C] text-xs tracking-widest uppercase mb-2 font-semibold">
          Hoy — Lunes 1 de junio de 2025
        </p>
        {registrado ? (
          <div>
            <CheckCircle2 size={48} className="text-emerald-400 mx-auto mb-3" />
            <h2
              className="text-[#F5F2EC] text-2xl mb-1"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              ¡Entrada registrada!
            </h2>
            <p className="text-[#F5F2EC]/50 text-sm">09:03 · Ubicación confirmada</p>
            <p className="text-[#F5F2EC]/30 text-xs mt-2">
              📍 Parroquia de San Miguel, Oaxaca
            </p>
          </div>
        ) : (
          <div>
            <h2
              className="text-[#F5F2EC] text-2xl mb-2"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              Registra tu entrada
            </h2>
            <p className="text-[#F5F2EC]/50 text-sm mb-6">
              Se usará tu ubicación GPS para confirmar que estás en el sitio de obra
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setRegistrado(true)}
                className="flex items-center justify-center gap-2 bg-[#C9A84C] text-[#1B2A5E] px-8 py-3.5 text-sm tracking-widest uppercase font-bold hover:bg-[#D4B86A] transition-colors"
              >
                <MapPin size={16} /> Marcar entrada con GPS
              </button>
              <button className="flex items-center justify-center gap-2 border border-[#F5F2EC]/20 text-[#F5F2EC]/60 hover:border-[#F5F2EC]/40 hover:text-[#F5F2EC] px-8 py-3.5 text-sm tracking-widest uppercase transition-colors">
                Notificar ausencia
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Días presentes", value: "18", color: "text-emerald-500" },
          { label: "Tardanzas", value: "2", color: "text-amber-500" },
          { label: "Faltas", value: "1", color: "text-red-400" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-[#EDE9E0] p-4 text-center">
            <p
              className={`text-3xl font-bold ${s.color}`}
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              {s.value}
            </p>
            <p className="text-[#7A7A7A] text-xs uppercase tracking-wider mt-1">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* History */}
      <div className="bg-white border border-[#EDE9E0]">
        <div className="px-5 py-3 border-b border-[#EDE9E0]">
          <h3
            className="text-[#1B2A5E] text-base"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Historial de asistencia
          </h3>
        </div>
        <div className="grid grid-cols-4 px-5 py-3 border-b border-[#EDE9E0] text-[#7A7A7A] text-xs tracking-widest uppercase">
          <div>Fecha</div>
          <div>Entrada</div>
          <div>Salida</div>
          <div>Estado</div>
        </div>
        {historial.map((h) => (
          <div
            key={h.fecha}
            className="grid grid-cols-4 px-5 py-3.5 border-b border-[#EDE9E0] last:border-0 items-center text-sm"
          >
            <div className="text-[#2C2C2C] font-medium">{h.fecha}</div>
            <div className="text-[#7A7A7A]">{h.entrada}</div>
            <div className="text-[#7A7A7A]">{h.salida}</div>
            <div className="flex items-center gap-2">
              {estadoIcon[h.estado as keyof typeof estadoIcon]}
              <span
                className={
                  h.estado === "ok"
                    ? "text-emerald-600"
                    : h.estado === "tarde"
                    ? "text-amber-600"
                    : "text-red-500"
                }
              >
                {estadoLabel[h.estado as keyof typeof estadoLabel]}
              </span>
            </div>
          </div>
        ))}
      </div>
    </DashboardShell>
  );
}
