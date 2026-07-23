"use client";

import DashboardShell from "@/components/dashboard/DashboardShell";
import { Plus, Package, AlertTriangle, CheckCircle2, Search } from "lucide-react";
import { useState } from "react";

const inventario = [
  { id: "MAT-001", nombre: "Pan de oro 23k (librillo)", categoria: "Acabados", stock: 12, minimo: 5, unidad: "librillos", estado: "ok" },
  { id: "MAT-002", nombre: "Cera microcristalina", categoria: "Consolidantes", stock: 2, minimo: 5, unidad: "kg", estado: "bajo" },
  { id: "MAT-003", nombre: "Barniz Paraloid B-72", categoria: "Barnices", stock: 8, minimo: 3, unidad: "litros", estado: "ok" },
  { id: "MAT-004", nombre: "Acuarela — set 24 colores", categoria: "Reintegración", stock: 4, minimo: 2, unidad: "sets", estado: "ok" },
  { id: "MAT-005", nombre: "Bisturí + hojas (caja 100)", categoria: "Herramientas", stock: 0, minimo: 2, unidad: "cajas", estado: "agotado" },
  { id: "MAT-006", nombre: "Pincel pelo marta #4", categoria: "Herramientas", stock: 15, minimo: 5, unidad: "pzas", estado: "ok" },
  { id: "MAT-007", nombre: "Resina epoxi de consolidación", categoria: "Consolidantes", stock: 1, minimo: 3, unidad: "kg", estado: "bajo" },
];

const solicitudesPendientes = [
  { id: "SOL-003", empleado: "Juan Pérez", material: "Cera microcristalina", cantidad: "3 kg", proyecto: "Retablo Mayor" },
  { id: "SOL-007", empleado: "Ana Martínez", material: "Bisturí + hojas", cantidad: "1 caja", proyecto: "Murales Ex-Convento" },
];

const estadoConfig = {
  ok: { label: "OK", cls: "text-emerald-700 bg-emerald-50 border-emerald-200", icon: <CheckCircle2 size={12} className="text-emerald-500" /> },
  bajo: { label: "Stock bajo", cls: "text-amber-700 bg-amber-50 border-amber-200", icon: <AlertTriangle size={12} className="text-amber-500" /> },
  agotado: { label: "Agotado", cls: "text-red-700 bg-red-50 border-red-200", icon: <AlertTriangle size={12} className="text-red-400" /> },
};

export default function InventarioAdmin() {
  const [search, setSearch] = useState("");

  const filtered = inventario.filter((i) =>
    i.nombre.toLowerCase().includes(search.toLowerCase()) ||
    i.categoria.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardShell role="admin" title="Inventario">
      {/* Solicitudes pendientes */}
      {solicitudesPendientes.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-4 mb-6">
          <p className="text-amber-700 text-xs tracking-widest uppercase font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle size={13} /> {solicitudesPendientes.length} solicitudes de material pendientes de aprobar
          </p>
          <div className="space-y-2">
            {solicitudesPendientes.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 bg-white border border-amber-100 p-3">
                <div>
                  <span className="text-[#7A7A7A] text-xs font-mono mr-2">{s.id}</span>
                  <span className="text-[#2C2C2C] text-sm font-medium">{s.material}</span>
                  <span className="text-[#7A7A7A] text-xs ml-2">({s.cantidad}) · {s.empleado} · {s.proyecto}</span>
                </div>
                <div className="flex gap-2">
                  <button className="bg-emerald-500 text-white px-3 py-1.5 text-xs tracking-widest uppercase font-semibold hover:bg-emerald-600 transition-colors">Aprobar</button>
                  <button className="border border-red-200 text-red-500 px-3 py-1.5 text-xs tracking-widest uppercase font-semibold hover:bg-red-50 transition-colors">Rechazar</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A7A7A]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar material..."
            className="w-full border border-[#EDE9E0] bg-white pl-9 pr-4 py-2.5 text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A84C] transition-colors" />
        </div>
        <button className="flex items-center gap-2 bg-[#C9A84C] text-[#1B2A5E] px-4 py-2.5 text-xs tracking-widest uppercase font-bold hover:bg-[#D4B86A] transition-colors">
          <Plus size={13} /> Agregar material
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#EDE9E0]">
        <div className="grid grid-cols-12 px-5 py-3 border-b border-[#EDE9E0] text-[#7A7A7A] text-xs tracking-widest uppercase">
          <div className="col-span-4">Material</div>
          <div className="col-span-2 hidden md:block">Categoría</div>
          <div className="col-span-2 text-center">Stock</div>
          <div className="col-span-2 text-center hidden md:block">Mínimo</div>
          <div className="col-span-2 text-right">Estado</div>
        </div>
        {filtered.map((item) => {
          const cfg = estadoConfig[item.estado as keyof typeof estadoConfig];
          return (
            <div key={item.id}
              className="grid grid-cols-12 px-5 py-4 border-b border-[#EDE9E0] last:border-0 hover:bg-[#F5F2EC] transition-colors items-center"
            >
              <div className="col-span-4 flex items-center gap-3">
                <Package size={14} className="text-[#C9A84C] shrink-0" />
                <div>
                  <p className="text-[#2C2C2C] text-sm font-medium">{item.nombre}</p>
                  <p className="text-[#7A7A7A] text-xs font-mono">{item.id}</p>
                </div>
              </div>
              <div className="col-span-2 hidden md:block text-[#7A7A7A] text-sm">{item.categoria}</div>
              <div className="col-span-2 text-center">
                <span className="text-[#1B2A5E] font-bold text-sm" style={{ fontFamily: "var(--font-playfair)" }}>{item.stock}</span>
                <span className="text-[#7A7A7A] text-xs ml-1">{item.unidad}</span>
              </div>
              <div className="col-span-2 text-center hidden md:block text-[#7A7A7A] text-sm">{item.minimo}</div>
              <div className="col-span-2 flex justify-end">
                <span className={`flex items-center gap-1.5 px-2.5 py-1 border text-xs font-semibold ${cfg.cls}`}>
                  {cfg.icon} {cfg.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </DashboardShell>
  );
}
