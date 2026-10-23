"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, Save, X } from "lucide-react";
import type { LedgerEntry } from "@/lib/db";

interface Lite { id: string; nombre: string }

const mxn = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
const money = (n: number) => mxn.format(Number.isFinite(n) ? n : 0);
const CARD = "bg-white border border-[#EDE9E0]";
const INPUT = "w-full border border-[#EDE9E0] bg-white px-3 py-2 text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A84C]";
const LABEL = "block text-xs text-[#7A7A7A] uppercase tracking-wider mb-1";
const BTN = "flex items-center gap-2 bg-[#1B2A5E] text-[#F5F2EC] px-4 py-2.5 text-xs tracking-widest uppercase font-semibold hover:bg-[#243470] disabled:opacity-60";
const CATEGORIAS = ["indirectos", "servicios", "viáticos", "impuestos", "material", "herramienta", "equipo", "adquisiciones", "utilidades", "nómina", "renta", "otro"];
const mesKey = (f?: string) => (f || "").slice(0, 7);

export default function GastosManager({ initial, proyectos }: { initial: LedgerEntry[]; proyectos: Lite[] }) {
  const [items, setItems] = useState<LedgerEntry[]>(initial);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const hoy = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ fecha: hoy, categoria: "indirectos", concepto: "", monto: "", projectId: "" });
  const [fMes, setFMes] = useState("");
  const [fCat, setFCat] = useState("");

  const proyNombre = useMemo(() => Object.fromEntries(proyectos.map((p) => [p.id, p.nombre])), [proyectos]);
  const meses = useMemo(() => [...new Set(items.map((i) => mesKey(i.fecha)).filter(Boolean))].sort().reverse(), [items]);
  const cats = useMemo(() => [...new Set(items.map((i) => i.categoria).filter(Boolean))].sort(), [items]);

  const filtered = items.filter((e) => (!fMes || mesKey(e.fecha) === fMes) && (!fCat || e.categoria === fCat));
  const total = filtered.reduce((a, e) => a + e.monto, 0);
  const totalGeneral = items.reduce((a, e) => a + e.monto, 0);
  const porCat = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of filtered) m[e.categoria || "otro"] = (m[e.categoria || "otro"] || 0) + e.monto;
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  async function crear() {
    setBusy(true);
    const res = await fetch("/api/costos/ledger", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, tipo: "egreso", projectId: form.projectId || null }),
    });
    setBusy(false);
    if (res.ok) {
      const { entry } = await res.json();
      setItems((xs) => [entry, ...xs]);
      setOpen(false); setForm({ fecha: hoy, categoria: "indirectos", concepto: "", monto: "", projectId: "" });
    }
  }
  async function borrar(id: string) {
    if (!confirm("¿Eliminar este gasto?")) return;
    if ((await fetch(`/api/costos/ledger/${id}`, { method: "DELETE" })).ok) setItems((xs) => xs.filter((x) => x.id !== id));
  }

  const visibles = [...filtered].sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <label className="text-xs text-[#7A7A7A] flex items-center gap-2">Mes
          <select value={fMes} onChange={(e) => setFMes(e.target.value)} className={INPUT + " w-36"}><option value="">Todos</option>{meses.map((m) => <option key={m} value={m}>{m}</option>)}</select>
        </label>
        <label className="text-xs text-[#7A7A7A] flex items-center gap-2">Categoría
          <select value={fCat} onChange={(e) => setFCat(e.target.value)} className={INPUT + " w-40"}><option value="">Todas</option>{cats.map((c) => <option key={c} value={c}>{c}</option>)}</select>
        </label>
        <button onClick={() => setOpen((v) => !v)} className={BTN + " ml-auto"}><Plus size={14} /> Registrar gasto</button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 mb-5">
        <Stat label={fMes || fCat ? "Gastos (filtro)" : "Gastos (todos)"} val={money(total)} />
        <Stat label="Total general" val={money(totalGeneral)} />
      </div>

      {porCat.length > 0 && (
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-[#7A7A7A] data-label mb-5">
          {porCat.map(([c, t]) => <span key={c}>{c}: <span className="text-[#1B2A5E]">{money(t)}</span></span>)}
        </div>
      )}

      {open && (
        <div className={`${CARD} p-5 mb-4`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[#1B2A5E] font-semibold" style={{ fontFamily: "var(--font-playfair)" }}>Registrar gasto</h3>
            <button onClick={() => setOpen(false)} className="text-[#7A7A7A] hover:text-[#1B2A5E]"><X size={18} /></button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div><label className={LABEL}>Fecha</label><input type="date" className={INPUT} value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} /></div>
            <div><label className={LABEL}>Categoría</label><select className={INPUT} value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>{CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
            <div className="lg:col-span-1"><label className={LABEL}>Concepto</label><input className={INPUT} value={form.concepto} onChange={(e) => setForm({ ...form, concepto: e.target.value })} /></div>
            <div><label className={LABEL}>Monto</label><input type="number" className={INPUT} value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} /></div>
            <div><label className={LABEL}>Destino</label><select className={INPUT} value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}><option value="">Empresa (general)</option>{proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></div>
          </div>
          <div className="mt-4"><button onClick={crear} disabled={busy} className={BTN}><Save size={14} /> Guardar</button></div>
        </div>
      )}

      <div className={`${CARD} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[#7A7A7A] text-xs uppercase tracking-wider border-b border-[#EDE9E0]">
              <th className="px-3 py-3 font-semibold">Fecha</th>
              <th className="px-3 py-3 font-semibold">Categoría</th>
              <th className="px-3 py-3 font-semibold">Concepto</th>
              <th className="px-3 py-3 font-semibold">Destino</th>
              <th className="px-3 py-3 font-semibold text-right">Monto</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {visibles.map((e) => (
              <tr key={e.id} className="border-b border-[#F5F2EC] hover:bg-[#F5F2EC]/50">
                <td className="px-3 py-2 data-label text-[#7A7A7A]">{e.fecha || "—"}</td>
                <td className="px-3 py-2 text-[#7A7A7A]">{e.categoria || "—"}</td>
                <td className="px-3 py-2 text-[#2C2C2C]">{e.concepto || "—"}</td>
                <td className="px-3 py-2 text-[#7A7A7A]">{e.projectId ? (proyNombre[e.projectId] || "Proyecto") : "Empresa"}</td>
                <td className="px-3 py-2 text-right data-label text-[#1B2A5E] font-medium">{money(e.monto)}</td>
                <td className="px-3 py-2 text-right"><button onClick={() => borrar(e.id)} className="text-[#7A7A7A] hover:text-red-500"><Trash2 size={15} /></button></td>
              </tr>
            ))}
            {visibles.length === 0 && <tr><td colSpan={6} className="px-3 py-12 text-center text-[#7A7A7A]">Sin gastos. Registra uno o impórtalos.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[#7A7A7A] mt-2">{visibles.length} gastos{(fMes || fCat) ? " (filtrados)" : ""}.</p>
    </div>
  );
}

function Stat({ label, val }: { label: string; val: string }) {
  return (
    <div className={`${CARD} p-4`}>
      <p className="text-[#1B2A5E] text-xl data-label" style={{ fontFamily: "var(--font-playfair)" }}>{val}</p>
      <p className="text-[#7A7A7A] text-xs uppercase tracking-wider mt-1">{label}</p>
    </div>
  );
}
