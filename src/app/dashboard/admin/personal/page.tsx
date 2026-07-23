"use client";

import DashboardShell from "@/components/dashboard/DashboardShell";
import { UserPlus, Star, Search, FolderOpen } from "lucide-react";
import { useState } from "react";

const empleados = [
  { id: "EMP-001", nombre: "Juan Pérez", rol: "Restaurador — Especialista en dorado", ranking: 95, proyecto: "Retablo Mayor", habilidades: ["Dorado al agua", "Consolidación", "Policromía"] },
  { id: "EMP-002", nombre: "Ana Martínez", rol: "Restauradora — Pintura mural", ranking: 91, proyecto: "Murales Ex-Convento", habilidades: ["Pintura mural", "Diagnóstico", "Fotografía"] },
  { id: "EMP-003", nombre: "Carlos Ruiz", rol: "Restaurador — Escultura", ranking: 87, proyecto: "Capilla Privada", habilidades: ["Escultura policromada", "Estuco", "Entelado"] },
  { id: "EMP-004", nombre: "Sofía Landa", rol: "Restauradora — Fachadas", ranking: 84, proyecto: "Palacio de la Reforma", habilidades: ["Cantería", "Estuco exterior", "Documentación"] },
  { id: "EMP-005", nombre: "Luis Torres", rol: "Restaurador — Conservación preventiva", ranking: 79, proyecto: null, habilidades: ["Conservación preventiva", "Análisis de materiales"] },
  { id: "EMP-006", nombre: "Elena Mora", rol: "Restauradora — General", ranking: 72, proyecto: null, habilidades: ["Limpieza", "Reintegración cromática"] },
];

const rankColor = (r: number) =>
  r >= 90 ? "text-emerald-600 bg-emerald-50 border-emerald-200" :
  r >= 80 ? "text-amber-600 bg-amber-50 border-amber-200" :
  "text-[#7A7A7A] bg-[#F5F2EC] border-[#EDE9E0]";

export default function PersonalAdmin() {
  const [search, setSearch] = useState("");

  const filtered = empleados.filter(
    (e) =>
      e.nombre.toLowerCase().includes(search.toLowerCase()) ||
      e.rol.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardShell role="admin" title="Gestión de personal">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A7A7A]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar empleado..."
            className="w-full border border-[#EDE9E0] bg-white pl-9 pr-4 py-2.5 text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A84C] transition-colors"
          />
        </div>
        <button className="flex items-center gap-2 bg-[#1B2A5E] text-[#F5F2EC] px-4 py-2.5 text-xs tracking-widest uppercase font-semibold hover:bg-[#243470] transition-colors">
          <UserPlus size={13} /> Agregar empleado
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total empleados", value: empleados.length },
          { label: "Asignados", value: empleados.filter((e) => e.proyecto).length },
          { label: "Sin asignación", value: empleados.filter((e) => !e.proyecto).length },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-[#EDE9E0] p-4 text-center">
            <p className="text-[#1B2A5E] text-3xl font-bold" style={{ fontFamily: "var(--font-playfair)" }}>
              {s.value}
            </p>
            <p className="text-[#7A7A7A] text-xs uppercase tracking-wider mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Employee list */}
      <div className="space-y-3">
        {filtered.map((emp) => (
          <div key={emp.id}
            className="bg-white border border-[#EDE9E0] p-5 flex flex-wrap items-center gap-4 hover:border-[#C9A84C]/40 transition-colors group"
          >
            {/* Avatar + name */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 bg-[#1B2A5E] flex items-center justify-center shrink-0">
                <span className="text-[#C9A84C] text-xs font-bold">
                  {emp.nombre.split(" ").map((n) => n[0]).join("")}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-[#1B2A5E] font-semibold text-sm">{emp.nombre}</p>
                <p className="text-[#7A7A7A] text-xs truncate">{emp.rol}</p>
              </div>
            </div>

            {/* Ranking */}
            <div className={`flex items-center gap-1.5 px-3 py-1 border text-xs font-bold shrink-0 ${rankColor(emp.ranking)}`}>
              <Star size={11} />
              {emp.ranking}
            </div>

            {/* Project */}
            <div className="flex items-center gap-2 text-sm shrink-0">
              <FolderOpen size={13} className={emp.proyecto ? "text-[#C9A84C]" : "text-[#EDE9E0]"} />
              <span className={emp.proyecto ? "text-[#2C2C2C]" : "text-[#EDE9E0] italic"}>
                {emp.proyecto ?? "Sin proyecto"}
              </span>
            </div>

            {/* Skills */}
            <div className="flex flex-wrap gap-1 flex-1 justify-end">
              {emp.habilidades.slice(0, 2).map((h) => (
                <span key={h} className="bg-[#EDE9E0] text-[#1B2A5E] text-xs px-2 py-0.5 font-medium">
                  {h}
                </span>
              ))}
              {emp.habilidades.length > 2 && (
                <span className="bg-[#EDE9E0] text-[#7A7A7A] text-xs px-2 py-0.5">
                  +{emp.habilidades.length - 2}
                </span>
              )}
            </div>

            {/* Assign button */}
            <button className="text-xs border border-[#1B2A5E] text-[#1B2A5E] px-3 py-1.5 hover:bg-[#1B2A5E] hover:text-[#F5F2EC] transition-colors tracking-wider uppercase font-semibold shrink-0 opacity-0 group-hover:opacity-100">
              Asignar
            </button>
          </div>
        ))}
      </div>
    </DashboardShell>
  );
}
