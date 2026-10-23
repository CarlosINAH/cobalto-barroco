"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, Save, X } from "lucide-react";
import type { PayrollEntry } from "@/lib/db";

interface Lite { id: string; nombre: string }

const mxn = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
const money = (n: number) => mxn.format(Number.isFinite(n) ? n : 0);
const CARD = "bg-white border border-[#EDE9E0]";
const INPUT = "w-full border border-[#EDE9E0] bg-white px-3 py-2 text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A84C]";
const LABEL = "block text-xs text-[#7A7A7A] uppercase tracking-wider mb-1";
const BTN = "flex items-center gap-2 bg-[#1B2A5E] text-[#F5F2EC] px-4 py-2.5 text-xs tracking-widest uppercase font-semibold hover:bg-[#243470] disabled:opacity-60";
const CATEGORIAS = ["nómina", "aguinaldo", "nómina externo", "administrativo", "otro"];

const mesKey = (f?: string) => (f || "").slice(0, 7);
const trimDe = (f?: string) => {
  const m = (f || "").match(/^(\d{4})-(\d{2})/);
  if (!m) return "";
  return `${m[1]}-T${Math.ceil(Number(m[2]) / 3)}`;
};

export default function NominaManager({ initial, empleados, proyectos }: { initial: PayrollEntry[]; empleados: Lite[]; proyectos: Lite[] }) {
  const [items, setItems] = useState<PayrollEntry[]>(initial);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const hoy = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ persona: "", categoria: "nómina", fecha: hoy, monto: "", projectId: "" });

  const proyNombre = useMemo(() => Object.fromEntries(proyectos.map((p) => [p.id, p.nombre])), [proyectos]);
  const meses = useMemo(() => [...new Set(items.map((i) => mesKey(i.fecha)).filter(Boolean))].sort().reverse(), [items]);
  const [mes, setMes] = useState("");
  const mesSel = mes || meses[0] || "";
  const trimSel = trimDe(mesSel + "-01");

  const total = items.reduce((a, e) => a + e.monto, 0);
  const totalMes = items.filter((e) => mesKey(e.fecha) === mesSel).reduce((a, e) => a + e.monto, 0);
  const totalTrim = items.filter((e) => trimDe(e.fecha) === trimSel).reduce((a, e) => a + e.monto, 0);
  const porCat = CATEGORIAS.map((c) => ({ c, t: items.filter((e) => (e.categoria || "otro") === c).reduce((a, e) => a + e.monto, 0) })).filter((x) => x.t > 0);

  async function crear() {
    if (!form.persona.trim()) return;
    setBusy(true);
    const res = await fetch("/api/costos/payroll", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, periodo: form.fecha, projectId: form.projectId || null, pagado: true }),
    });
    setBusy(false);
    if (res.ok) {
      const { entry } = await res.json();
      setItems((xs) => [entry, ...xs]);
      setOpen(false); setForm({ persona: "", categoria: "nómina", fecha: hoy, monto: "", projectId: "" });
    }
  }
  async function borrar(id: string) {
    if (!confirm("¿Eliminar este pago?")) return;
    if ((await fetch(`/api/costos/payroll/${id}`, { method: "DELETE" })).ok) setItems((xs) => xs.filter((x) => x.id !== id));
  }

  const visibles = [...items].sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <label className="text-xs text-[#7A7A7A] flex items-center gap-2">Mes
          <select value={mesSel} onChange={(e) => setMes(e.target.value)} className={INPUT + " w-40"}>
            {meses.length === 0 && <option value="">—</option>}
            {meses.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <button onClick={() => setOpen((v) => !v)} className={BTN + " ml-auto"}><Plus size={14} /> Registrar pago</button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 mb-5">
        <Stat label="Total nómina" val={money(total)} />
        <Stat label={`Mes ${mesSel || "—"}`} val={money(totalMes)} />
        <Stat label={`Trimestre ${trimSel || "—"}`} val={money(totalTrim)} />
      </div>

      {porCat.length > 0 && (
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-[#7A7A7A] data-label mb-5">
          {porCat.map((x) => <span key={x.c}>{x.c}: <span className="text-[#1B2A5E]">{money(x.t)}</span></span>)}
        </div>
      )}

      {open && (
        <div className={`${CARD} p-5 mb-4`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[#1B2A5E] font-semibold" style={{ fontFamily: "var(--font-playfair)" }}>Registrar pago</h3>
            <button onClick={() => setOpen(false)} className="text-[#7A7A7A] hover:text-[#1B2A5E]"><X size={18} /></button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className={LABEL}>Persona</label>
              <input className={INPUT} list="empleados" value={form.persona} onChange={(e) => setForm({ ...form, persona: e.target.value })} placeholder="Nombre" />
              <datalist id="empleados">{empleados.map((e) => <option key={e.id} value={e.nombre} />)}</datalist>
            </div>
            <div><label className={LABEL}>Categoría</label><select className={INPUT} value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>{CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
            <div><label className={LABEL}>Fecha</label><input type="date" className={INPUT} value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} /></div>
            <div><label className={LABEL}>Monto</label><input type="number" className={INPUT} value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} /></div>
            <div><label className={LABEL}>Proyecto</label><select className={INPUT} value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}><option value="">Empresa (sin proyecto)</option>{proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></div>
          </div>
          <div className="mt-4"><button onClick={crear} disabled={busy} className={BTN}><Save size={14} /> Guardar</button></div>
        </div>
      )}

      <div className={`${CARD} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[#7A7A7A] text-xs uppercase tracking-wider border-b border-[#EDE9E0]">
              <th className="px-3 py-3 font-semibold">Fecha</th>
              <th className="px-3 py-3 font-semibold">Persona</th>
              <th className="px-3 py-3 font-semibold">Categoría</th>
              <th className="px-3 py-3 font-semibold">Destino</th>
              <th className="px-3 py-3 font-semibold text-right">Monto</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {visibles.map((e) => (
              <tr key={e.id} className="border-b border-[#F5F2EC] hover:bg-[#F5F2EC]/50">
                <td className="px-3 py-2 data-label text-[#7A7A7A]">{e.fecha || e.periodo || "—"}</td>
                <td className="px-3 py-2 text-[#2C2C2C]">{e.persona}</td>
                <td className="px-3 py-2 text-[#7A7A7A]">{e.categoria || "—"}</td>
                <td className="px-3 py-2 text-[#7A7A7A]">{e.projectId ? (proyNombre[e.projectId] || "Proyecto") : "Empresa"}</td>
                <td className="px-3 py-2 text-right data-label text-[#1B2A5E] font-medium">{money(e.monto)}</td>
                <td className="px-3 py-2 text-right"><button onClick={() => borrar(e.id)} className="text-[#7A7A7A] hover:text-red-500"><Trash2 size={15} /></button></td>
              </tr>
            ))}
            {visibles.length === 0 && <tr><td colSpan={6} className="px-3 py-12 text-center text-[#7A7A7A]">Sin pagos de nómina. Registra uno o impórtalos.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[#7A7A7A] mt-2">{items.length} pagos · {money(total)} total.</p>
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
