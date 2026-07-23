"use client";

import DashboardShell from "@/components/dashboard/DashboardShell";
import { Plus, CheckCircle2, Clock, XCircle, Send } from "lucide-react";
import { useState } from "react";

const solicitudes = [
  {
    id: "SOL-003",
    material: "Cera microcristalina",
    cantidad: "3 kg",
    fecha: "28 May",
    estado: "aprobado",
    nota: "Aprobado por admin · En camino",
  },
  {
    id: "SOL-002",
    material: "Pan de oro 23k (librillo x25)",
    cantidad: "2 librillos",
    fecha: "10 May",
    estado: "entregado",
    nota: "Entregado el 14 May",
  },
  {
    id: "SOL-001",
    material: "Barniz Paraloid B-72",
    cantidad: "500 ml",
    fecha: "02 May",
    estado: "rechazado",
    nota: "Stock insuficiente. Contactar admin.",
  },
];

const estadoConfig = {
  aprobado: { icon: <CheckCircle2 size={14} className="text-amber-500" />, label: "Aprobado", cls: "text-amber-600 bg-amber-50 border-amber-200" },
  entregado: { icon: <CheckCircle2 size={14} className="text-emerald-500" />, label: "Entregado", cls: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  pendiente: { icon: <Clock size={14} className="text-blue-400" />, label: "Pendiente", cls: "text-blue-600 bg-blue-50 border-blue-200" },
  rechazado: { icon: <XCircle size={14} className="text-red-400" />, label: "Rechazado", cls: "text-red-600 bg-red-50 border-red-200" },
};

export default function MaterialesEmpleado() {
  const [showForm, setShowForm] = useState(false);
  const [sent, setSent] = useState(false);

  return (
    <DashboardShell role="empleado" title="Solicitud de material">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-[#7A7A7A] text-sm">
          Proyecto:{" "}
          <span className="text-[#1B2A5E] font-medium">
            Retablo Mayor — Parroquia de San Miguel
          </span>
        </p>
        <button
          onClick={() => { setShowForm(true); setSent(false); }}
          className="flex items-center gap-2 bg-[#1B2A5E] text-[#F5F2EC] px-4 py-2.5 text-xs tracking-widest uppercase font-semibold hover:bg-[#243470] transition-colors"
        >
          <Plus size={13} /> Nueva solicitud
        </button>
      </div>

      {/* New request form */}
      {showForm && (
        <div className="bg-white border border-[#C9A84C]/40 p-6 mb-6">
          <h3
            className="text-[#1B2A5E] text-lg mb-5"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Nueva solicitud de material
          </h3>
          {sent ? (
            <div className="text-center py-8">
              <Send size={32} className="text-[#C9A84C] mx-auto mb-3" />
              <p className="text-[#1B2A5E] font-semibold">Solicitud enviada al administrador</p>
              <p className="text-[#7A7A7A] text-sm mt-1">Recibirás una notificación cuando sea revisada.</p>
              <button onClick={() => setShowForm(false)} className="mt-4 text-[#C9A84C] text-sm underline">Cerrar</button>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); setSent(true); }} className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-[#7A7A7A] text-xs tracking-widest uppercase mb-2">Material</label>
                <input required className="w-full border border-[#EDE9E0] bg-[#F5F2EC] text-[#2C2C2C] px-4 py-3 text-sm focus:outline-none focus:border-[#C9A84C] transition-colors" placeholder="Ej. Pan de oro 23k" />
              </div>
              <div>
                <label className="block text-[#7A7A7A] text-xs tracking-widest uppercase mb-2">Cantidad</label>
                <input required className="w-full border border-[#EDE9E0] bg-[#F5F2EC] text-[#2C2C2C] px-4 py-3 text-sm focus:outline-none focus:border-[#C9A84C] transition-colors" placeholder="Ej. 2 librillos, 500ml" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[#7A7A7A] text-xs tracking-widest uppercase mb-2">Justificación / Notas</label>
                <textarea rows={3} className="w-full border border-[#EDE9E0] bg-[#F5F2EC] text-[#2C2C2C] px-4 py-3 text-sm focus:outline-none focus:border-[#C9A84C] transition-colors resize-none" placeholder="¿Para qué etapa del proyecto necesitas este material?" />
              </div>
              <div className="sm:col-span-2 flex gap-3">
                <button type="submit" className="bg-[#C9A84C] text-[#1B2A5E] px-6 py-2.5 text-xs tracking-widest uppercase font-bold hover:bg-[#D4B86A] transition-colors">
                  Enviar solicitud
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="border border-[#EDE9E0] text-[#7A7A7A] px-6 py-2.5 text-xs tracking-widest uppercase hover:border-[#1B2A5E] transition-colors">
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Solicitudes history */}
      <div className="space-y-4">
        {solicitudes.map((s) => {
          const cfg = estadoConfig[s.estado as keyof typeof estadoConfig];
          return (
            <div key={s.id} className="bg-white border border-[#EDE9E0] p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-[#7A7A7A] text-xs font-mono">{s.id}</span>
                  <span className="text-[#7A7A7A] text-xs">·</span>
                  <span className="text-[#7A7A7A] text-xs">{s.fecha}</span>
                </div>
                <p className="text-[#1B2A5E] font-semibold text-sm">{s.material}</p>
                <p className="text-[#7A7A7A] text-xs mt-0.5">Cantidad: {s.cantidad}</p>
                <p className="text-[#7A7A7A] text-xs mt-1">{s.nota}</p>
              </div>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 border text-xs font-semibold tracking-wide ${cfg.cls} shrink-0`}>
                {cfg.icon}
                {cfg.label}
              </div>
            </div>
          );
        })}
      </div>
    </DashboardShell>
  );
}
