"use client";

import { useMemo, useState } from "react";
import { Search, Package, FlaskConical } from "lucide-react";

interface Mat { id: string; nombre: string; kind: "material" | "herramienta" | "equipo"; categoria: string; precio: number; unidad: string; url: string }
interface Comp { nombre: string; precio: number; cantidad: number }
interface Rec { id: string; nombre: string; rendimiento: string; unidad: string; costo: number; componentes: Comp[] }

const mxn = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
const money = (n: number) => mxn.format(Number.isFinite(n) ? n : 0);
const KIND: Record<Mat["kind"], string> = { material: "Material", herramienta: "Herramienta", equipo: "Equipo" };

function rendQty(r: string) { const m = (r || "").match(/([\d]+(?:[.,][\d]+)?)/); const q = m ? parseFloat(m[1].replace(",", ".")) : 0; return q > 0 ? q : 1; }

export default function EmpleadoCatalogos({ materiales, recetas }: { materiales: Mat[]; recetas: Rec[] }) {
  const [tab, setTab] = useState<"materiales" | "recetas">("materiales");
  return (
    <div>
      <div className="flex gap-1 border-b border-[#EDE9E0] mb-6">
        {([["materiales", "Materiales", Package], ["recetas", "Recetas", FlaskConical]] as const).map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs tracking-wider uppercase font-semibold border-b-2 -mb-px ${tab === id ? "border-[#C9A84C] text-[#1B2A5E]" : "border-transparent text-[#7A7A7A] hover:text-[#1B2A5E]"}`}>
            <Icon size={14} /> {label} <span className="text-[#7A7A7A] font-normal">({id === "materiales" ? materiales.length : recetas.length})</span>
          </button>
        ))}
      </div>
      {tab === "materiales" ? <Materiales materiales={materiales} /> : <Recetas recetas={recetas} />}
    </div>
  );
}

function Materiales({ materiales }: { materiales: Mat[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const cats = useMemo(() => [...new Set(materiales.map((m) => m.categoria).filter(Boolean))].sort(), [materiales]);
  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return materiales.filter((m) => (!cat || m.categoria === cat) && (!n || m.nombre.toLowerCase().includes(n)));
  }, [materiales, q, cat]);
  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A7A7A]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar material…" className="w-full border border-[#EDE9E0] bg-white pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]" />
        </div>
        <select value={cat} onChange={(e) => setCat(e.target.value)} className="border border-[#EDE9E0] bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]">
          <option value="">Todas las categorías</option>
          {cats.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="bg-white border border-[#EDE9E0] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[#7A7A7A] text-xs uppercase tracking-wider border-b border-[#EDE9E0]">
              <th className="px-4 py-3 font-semibold">Material</th>
              <th className="px-4 py-3 font-semibold">Tipo</th>
              <th className="px-4 py-3 font-semibold">Categoría</th>
              <th className="px-4 py-3 font-semibold text-right">Precio</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.id} className="border-b border-[#F5F2EC] hover:bg-[#F5F2EC]/50">
                <td className="px-4 py-2.5 text-[#2C2C2C]">{m.url ? <a href={m.url} target="_blank" rel="noopener noreferrer" className="hover:text-[#C9A84C] hover:underline">{m.nombre}</a> : m.nombre}</td>
                <td className="px-4 py-2.5 text-[#7A7A7A]">{KIND[m.kind]}</td>
                <td className="px-4 py-2.5 text-[#7A7A7A]">{m.categoria || "—"}</td>
                <td className="px-4 py-2.5 text-right data-label text-[#1B2A5E]">{money(m.precio)}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={4} className="px-4 py-12 text-center text-[#7A7A7A]">Sin resultados.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[#7A7A7A] mt-2">{filtered.length} de {materiales.length} materiales (solo lectura).</p>
    </div>
  );
}

function Recetas({ recetas }: { recetas: Rec[] }) {
  if (recetas.length === 0) return <div className="bg-white border border-[#EDE9E0] py-16 text-center text-sm text-[#7A7A7A]">No hay recetas.</div>;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {recetas.map((r) => <RecetaCard key={r.id} receta={r} />)}
    </div>
  );
}

function RecetaCard({ receta: r }: { receta: Rec }) {
  const qty = rendQty(r.rendimiento);
  const porUnidad = r.costo / qty;
  const [prep, setPrep] = useState(String(qty));
  const cant = Number(prep) || 0;
  return (
    <div className="bg-white border border-[#EDE9E0] p-5">
      <div className="flex items-baseline justify-between mb-1">
        <h3 className="text-[#1B2A5E] font-semibold" style={{ fontFamily: "var(--font-playfair)" }}>{r.nombre}</h3>
        <span className="data-label text-[#C9A84C] font-semibold">{money(r.costo)}</span>
      </div>
      <p className="text-xs text-[#7A7A7A] mb-3 data-label">Lote {r.rendimiento || "—"} · {money(porUnidad)}/{r.unidad || "u"}</p>
      <table className="w-full text-xs">
        <tbody>
          {r.componentes.map((c, i) => (
            <tr key={i} className="border-t border-[#F5F2EC]">
              <td className="py-1.5 text-[#2C2C2C]">{c.nombre}</td>
              <td className="py-1.5 text-right text-[#7A7A7A] data-label">×{c.cantidad}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 pt-3 border-t border-[#EDE9E0] flex items-center gap-2 text-sm">
        <span className="text-xs text-[#7A7A7A] uppercase tracking-wider">Preparar</span>
        <input type="number" step="0.01" value={prep} onChange={(e) => setPrep(e.target.value)} className="w-20 border border-[#EDE9E0] px-2 py-1 text-right text-sm focus:outline-none focus:border-[#C9A84C] data-label" />
        <span className="text-xs text-[#7A7A7A]">{r.unidad || "u"} =</span>
        <span className="data-label text-[#C9A84C] font-bold ml-auto">{money(cant * porUnidad)}</span>
      </div>
    </div>
  );
}
