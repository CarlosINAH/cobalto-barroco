"use client";

import DashboardShell from "@/components/dashboard/DashboardShell";
import { Plus, MapPin, Calendar, Users, ChevronRight } from "lucide-react";
import { useState } from "react";

const allProyectos = [
  {
    id: "PRY-004", nombre: "Capilla Privada", ubicacion: "Querétaro", inicio: "15 Abr 2025",
    entrega: "15 Sep 2025", avance: 15, empleados: 3, estado: "activo",
    desc: "Restauración de pintura mural y retablo principal.",
  },
  {
    id: "PRY-003", nombre: "Retablo Mayor — San Miguel", ubicacion: "Oaxaca", inicio: "12 Ene 2025",
    entrega: "30 Jul 2025", avance: 65, empleados: 6, estado: "activo",
    desc: "Restauración integral de retablo barroco policromado S.XVIII.",
  },
  {
    id: "PRY-002", nombre: "Fachada Palacio de la Reforma", ubicacion: "Puebla", inicio: "01 Mar 2025",
    entrega: "30 Nov 2025", avance: 40, empleados: 8, estado: "activo",
    desc: "Intervención en fachada neoclásica. Cantería y elementos ornamentales.",
  },
  {
    id: "PRY-001", nombre: "Murales Ex-Convento", ubicacion: "CDMX", inicio: "01 Sep 2024",
    entrega: "30 Jun 2025", avance: 90, empleados: 4, estado: "activo",
    desc: "Restauración de pinturas murales del siglo XVII.",
  },
  {
    id: "PRY-000", nombre: "Altar Mayor Catedral", ubicacion: "Guadalajara", inicio: "Jun 2024",
    entrega: "Ene 2025", avance: 100, empleados: 10, estado: "finalizado",
    desc: "Proyecto completado exitosamente.",
  },
];

type Filter = "todos" | "activo" | "finalizado" | "futuro";

export default function ProyectosAdmin() {
  const [filter, setFilter] = useState<Filter>("todos");

  const filtered = allProyectos.filter((p) =>
    filter === "todos" ? true : p.estado === filter
  );

  const estadoColor: Record<string, string> = {
    activo: "bg-emerald-100 text-emerald-700 border-emerald-200",
    finalizado: "bg-blue-100 text-blue-700 border-blue-200",
    futuro: "bg-amber-100 text-amber-700 border-amber-200",
  };

  return (
    <DashboardShell role="admin" title="Proyectos">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        {/* Filters */}
        <div className="flex gap-2">
          {(["todos", "activo", "finalizado", "futuro"] as Filter[]).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 text-xs tracking-widest uppercase font-semibold transition-colors ${
                filter === f ? "bg-[#1B2A5E] text-[#C9A84C]" : "bg-white border border-[#EDE9E0] text-[#7A7A7A] hover:border-[#1B2A5E]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <button className="flex items-center gap-2 bg-[#C9A84C] text-[#1B2A5E] px-4 py-2.5 text-xs tracking-widest uppercase font-bold hover:bg-[#D4B86A] transition-colors">
          <Plus size={13} /> Nuevo proyecto
        </button>
      </div>

      <div className="space-y-4">
        {filtered.map((p) => (
          <div key={p.id} className="bg-white border border-[#EDE9E0] p-6 hover:border-[#C9A84C]/40 transition-colors group">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-[#7A7A7A] text-xs font-mono">{p.id}</span>
                  <span className={`px-2 py-0.5 text-xs border font-semibold tracking-wide ${estadoColor[p.estado]}`}>
                    {p.estado}
                  </span>
                </div>
                <h3 className="text-[#1B2A5E] text-xl mb-1" style={{ fontFamily: "var(--font-playfair)" }}>
                  {p.nombre}
                </h3>
                <p className="text-[#7A7A7A] text-sm mb-3">{p.desc}</p>
                <div className="flex flex-wrap gap-4 text-[#7A7A7A] text-xs">
                  <span className="flex items-center gap-1"><MapPin size={11} />{p.ubicacion}</span>
                  <span className="flex items-center gap-1"><Calendar size={11} />{p.inicio} → {p.entrega}</span>
                  <span className="flex items-center gap-1"><Users size={11} />{p.empleados} empleados</span>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-center">
                  <p className="text-[#C9A84C] text-2xl font-bold" style={{ fontFamily: "var(--font-playfair)" }}>{p.avance}%</p>
                  <p className="text-[#7A7A7A] text-xs uppercase tracking-wider">Avance</p>
                </div>
                <ChevronRight size={16} className="text-[#EDE9E0] group-hover:text-[#C9A84C] transition-colors" />
              </div>
            </div>
            {/* Progress */}
            <div className="mt-4 h-1 bg-[#EDE9E0]">
              <div className="h-1 bg-gradient-to-r from-[#1B2A5E] to-[#C9A84C]"
                style={{ width: `${p.avance}%` }} />
            </div>
          </div>
        ))}
      </div>
    </DashboardShell>
  );
}
