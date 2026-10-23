"use client";

import { useState } from "react";
import { Plus, Trash2, Save, Pencil, X, Building2 } from "lucide-react";
import type { Project } from "@/lib/db";

const mxn = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
const money = (n: number | undefined) => mxn.format(Number.isFinite(n) ? (n as number) : 0);

const CARD = "bg-white border border-[#EDE9E0]";
const INPUT = "w-full border border-[#EDE9E0] bg-white px-3 py-2 text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A84C]";
const LABEL = "block text-xs text-[#7A7A7A] uppercase tracking-wider mb-1";
const BTN = "flex items-center gap-2 bg-[#1B2A5E] text-[#F5F2EC] px-4 py-2.5 text-xs tracking-widest uppercase font-semibold hover:bg-[#243470] disabled:opacity-60";

const ESTADOS = ["activo", "finalizado", "futuro"] as const;
const ESTADO_CLS: Record<string, string> = {
  activo: "bg-green-50 text-green-700 border-green-200",
  finalizado: "bg-[#F5F2EC] text-[#7A7A7A] border-[#EDE9E0]",
  futuro: "bg-[#1B2A5E]/5 text-[#1B2A5E] border-[#1B2A5E]/20",
};

type Form = {
  id: string | null;
  cliente: string;
  tipo: string;
  ubicacion: string;
  estado: Project["estado"];
  inicio: string;
  montoTotal: string;
  anticipo: string;
  egresos: string;
  utilidad: string;
};
const EMPTY: Form = { id: null, cliente: "", tipo: "", ubicacion: "", estado: "activo", inicio: "", montoTotal: "", anticipo: "", egresos: "", utilidad: "" };

export default function AdministracionManager({ initial }: { initial: Project[] }) {
  const [items, setItems] = useState<Project[]>(initial);
  const [form, setForm] = useState<Form>(EMPTY);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const sum = (k: keyof Project) => items.reduce((a, p) => a + (Number(p[k]) || 0), 0);
  const totalC = sum("montoTotal"), antic = sum("anticipo"), egr = sum("egresos"), util = sum("utilidad");

  function nuevo() { setForm(EMPTY); setError(""); setOpen(true); }
  function editar(p: Project) {
    setForm({
      id: p.id, cliente: p.cliente || "", tipo: p.tipo || "", ubicacion: p.ubicacion || "",
      estado: p.estado, inicio: p.inicio || "",
      montoTotal: p.montoTotal != null ? String(p.montoTotal) : "",
      anticipo: p.anticipo != null ? String(p.anticipo) : "",
      egresos: p.egresos != null ? String(p.egresos) : "",
      utilidad: p.utilidad != null ? String(p.utilidad) : "",
    });
    setError(""); setOpen(true);
  }

  async function guardar() {
    const cliente = form.cliente.trim();
    const tipo = form.tipo.trim();
    if (!cliente && !tipo) { setError("Pon al menos cliente o tipo de obra."); return; }
    setBusy(true); setError("");
    const payload = {
      nombre: [cliente, tipo].filter(Boolean).join(" — ") || "Obra",
      cliente, tipo, ubicacion: form.ubicacion.trim(), estado: form.estado, inicio: form.inicio,
      montoTotal: form.montoTotal, anticipo: form.anticipo, egresos: form.egresos, utilidad: form.utilidad,
    };
    const res = await fetch(form.id ? `/api/projects/${form.id}` : "/api/projects", {
      method: form.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    if (!res.ok) { setError("No se pudo guardar."); return; }
    const { project } = await res.json();
    setItems((xs) => (form.id ? xs.map((x) => (x.id === project.id ? project : x)) : [project, ...xs]));
    setOpen(false);
  }

  async function borrar(id: string) {
    if (!confirm("¿Eliminar esta obra?")) return;
    if ((await fetch(`/api/projects/${id}`, { method: "DELETE" })).ok)
      setItems((xs) => xs.filter((x) => x.id !== id));
  }

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-4 mb-5">
        <Stat label="Contratado" val={money(totalC)} />
        <Stat label="Anticipos" val={money(antic)} />
        <Stat label="Egresos" val={money(egr)} />
        <Stat label="Utilidad" val={money(util)} />
      </div>

      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-[#7A7A7A]">{items.length} obras · datos financieros (solo administración).</p>
        <button onClick={nuevo} className={BTN}><Plus size={14} /> Nueva obra</button>
      </div>

      {open && (
        <div className={`${CARD} p-5 mb-4`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[#1B2A5E] font-semibold" style={{ fontFamily: "var(--font-playfair)" }}>{form.id ? "Editar obra" : "Nueva obra"}</h3>
            <button onClick={() => setOpen(false)} className="text-[#7A7A7A] hover:text-[#1B2A5E]"><X size={18} /></button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div><label className={LABEL}>Cliente</label><input className={INPUT} value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })} /></div>
            <div><label className={LABEL}>Tipo</label><input className={INPUT} value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} /></div>
            <div><label className={LABEL}>Ciudad</label><input className={INPUT} value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} /></div>
            <div><label className={LABEL}>Estado</label><select className={INPUT} value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value as Project["estado"] })}>{ESTADOS.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
            <div><label className={LABEL}>Inicio</label><input type="date" className={INPUT} value={form.inicio} onChange={(e) => setForm({ ...form, inicio: e.target.value })} /></div>
            <div><label className={LABEL}>Monto total</label><input type="number" className={INPUT} value={form.montoTotal} onChange={(e) => setForm({ ...form, montoTotal: e.target.value })} /></div>
            <div><label className={LABEL}>Anticipo</label><input type="number" className={INPUT} value={form.anticipo} onChange={(e) => setForm({ ...form, anticipo: e.target.value })} /></div>
            <div><label className={LABEL}>Egresos</label><input type="number" className={INPUT} value={form.egresos} onChange={(e) => setForm({ ...form, egresos: e.target.value })} /></div>
            <div><label className={LABEL}>Utilidad</label><input type="number" className={INPUT} value={form.utilidad} onChange={(e) => setForm({ ...form, utilidad: e.target.value })} /></div>
          </div>
          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
          <div className="flex gap-2 mt-4">
            <button onClick={guardar} disabled={busy} className={BTN}><Save size={14} /> Guardar</button>
            <button onClick={() => setOpen(false)} className="px-4 py-2.5 text-xs tracking-widest uppercase text-[#7A7A7A] hover:text-[#1B2A5E]">Cancelar</button>
          </div>
        </div>
      )}

      <div className={`${CARD} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[#7A7A7A] text-xs uppercase tracking-wider border-b border-[#EDE9E0]">
              <th className="px-3 py-3 font-semibold">Cliente</th>
              <th className="px-3 py-3 font-semibold">Tipo</th>
              <th className="px-3 py-3 font-semibold">Ciudad</th>
              <th className="px-3 py-3 font-semibold">Estado</th>
              <th className="px-3 py-3 font-semibold text-right">Total</th>
              <th className="px-3 py-3 font-semibold text-right">Anticipo</th>
              <th className="px-3 py-3 font-semibold text-right">Egresos</th>
              <th className="px-3 py-3 font-semibold text-right">Utilidad</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} className="border-b border-[#F5F2EC] hover:bg-[#F5F2EC]/50">
                <td className="px-3 py-2 text-[#2C2C2C]">{p.cliente || p.nombre}</td>
                <td className="px-3 py-2 text-[#7A7A7A]">{p.tipo || "—"}</td>
                <td className="px-3 py-2 text-[#7A7A7A]">{p.ubicacion || "—"}</td>
                <td className="px-3 py-2"><span className={`text-xs px-2 py-0.5 border ${ESTADO_CLS[p.estado] || ""}`}>{p.estado}</span></td>
                <td className="px-3 py-2 text-right data-label">{money(p.montoTotal)}</td>
                <td className="px-3 py-2 text-right data-label text-[#7A7A7A]">{money(p.anticipo)}</td>
                <td className="px-3 py-2 text-right data-label text-[#7A7A7A]">{money(p.egresos)}</td>
                <td className="px-3 py-2 text-right data-label text-[#1B2A5E] font-medium">{money(p.utilidad)}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <button onClick={() => editar(p)} className="text-[#7A7A7A] hover:text-[#1B2A5E] mr-2"><Pencil size={15} /></button>
                  <button onClick={() => borrar(p.id)} className="text-[#7A7A7A] hover:text-red-500"><Trash2 size={15} /></button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={9} className="px-3 py-12 text-center text-[#7A7A7A]"><Building2 size={20} className="mx-auto mb-2 opacity-40" />Sin obras. Agrega una o impórtalas.</td></tr>
            )}
          </tbody>
        </table>
      </div>
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
