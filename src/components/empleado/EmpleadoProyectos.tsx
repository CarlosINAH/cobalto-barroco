"use client";

import { useState } from "react";
import { Plus, MapPin, FlaskConical, Check, X } from "lucide-react";

interface Proy { id: string; nombre: string; ubicacion: string; estado: string }
interface Rec { id: string; nombre: string; unidad: string; rendimiento: string }

const CARD = "bg-white border border-[#EDE9E0]";
const INPUT = "w-full border border-[#EDE9E0] bg-white px-3 py-2 text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A84C]";
const LABEL = "block text-xs text-[#7A7A7A] uppercase tracking-wider mb-1";
const BTN = "flex items-center gap-2 bg-[#1B2A5E] text-[#F5F2EC] px-4 py-2.5 text-xs tracking-widest uppercase font-semibold hover:bg-[#243470] disabled:opacity-60";
const ESTADO_CLS: Record<string, string> = {
  activo: "bg-green-50 text-green-700 border-green-200",
  finalizado: "bg-[#F5F2EC] text-[#7A7A7A] border-[#EDE9E0]",
  futuro: "bg-[#1B2A5E]/5 text-[#1B2A5E] border-[#1B2A5E]/20",
};

export default function EmpleadoProyectos({ proyectos, recetas }: { proyectos: Proy[]; recetas: Rec[] }) {
  const [items, setItems] = useState<Proy[]>(proyectos);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ nombre: "", ubicacion: "", tipo: "", estado: "activo", inicio: "" });

  async function crear() {
    if (!form.nombre.trim()) return;
    setBusy(true);
    const res = await fetch("/api/projects", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setBusy(false);
    if (res.ok) {
      const { project } = await res.json();
      setItems((xs) => [{ id: project.id, nombre: project.nombre, ubicacion: project.ubicacion, estado: project.estado }, ...xs]);
      setOpen(false); setForm({ nombre: "", ubicacion: "", tipo: "", estado: "activo", inicio: "" });
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center gap-3 mb-5">
        <p className="text-sm text-[#7A7A7A]">Registra proyectos y agrega las recetas que uses en cada uno.</p>
        <button onClick={() => setOpen((v) => !v)} className={BTN}><Plus size={14} /> Registrar proyecto</button>
      </div>

      {open && (
        <div className={`${CARD} p-5 mb-5`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[#1B2A5E] font-semibold" style={{ fontFamily: "var(--font-playfair)" }}>Nuevo proyecto</h3>
            <button onClick={() => setOpen(false)} className="text-[#7A7A7A] hover:text-[#1B2A5E]"><X size={18} /></button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="lg:col-span-2"><label className={LABEL}>Nombre del proyecto</label><input className={INPUT} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></div>
            <div><label className={LABEL}>Ubicación</label><input className={INPUT} value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} /></div>
            <div><label className={LABEL}>Tipo de trabajo</label><input className={INPUT} value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} /></div>
            <div><label className={LABEL}>Estado</label><select className={INPUT} value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}><option value="activo">activo</option><option value="futuro">futuro</option><option value="finalizado">finalizado</option></select></div>
            <div><label className={LABEL}>Inicio</label><input type="date" className={INPUT} value={form.inicio} onChange={(e) => setForm({ ...form, inicio: e.target.value })} /></div>
          </div>
          <div className="mt-4"><button onClick={crear} disabled={busy} className={BTN}>Guardar proyecto</button></div>
        </div>
      )}

      {items.length === 0 ? (
        <div className={`${CARD} py-14 px-6 text-center text-sm text-[#7A7A7A]`}>Aún no hay proyectos. Registra el primero.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => <ProyectoCard key={p.id} proyecto={p} recetas={recetas} />)}
        </div>
      )}
    </div>
  );
}

function ProyectoCard({ proyecto: p, recetas }: { proyecto: Proy; recetas: Rec[] }) {
  const [recetaId, setRecetaId] = useState("");
  const [cant, setCant] = useState("1");
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);

  async function agregar() {
    if (!recetaId) return;
    setBusy(true); setOk(false);
    const res = await fetch("/api/costos/project-expense", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: p.id, recipeId: recetaId, cantidad: Number(cant) || 0 }),
    });
    setBusy(false);
    if (res.ok) { setOk(true); setRecetaId(""); setCant("1"); setTimeout(() => setOk(false), 2500); }
  }
  const rec = recetas.find((r) => r.id === recetaId);

  return (
    <div className={`${CARD} p-5`}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[#1B2A5E] font-semibold leading-tight" style={{ fontFamily: "var(--font-playfair)" }}>{p.nombre}</h3>
        <span className={`text-xs px-2 py-0.5 border shrink-0 ${ESTADO_CLS[p.estado] || ""}`}>{p.estado}</span>
      </div>
      {p.ubicacion && <p className="flex items-center gap-1 text-xs text-[#7A7A7A] mt-1"><MapPin size={12} /> {p.ubicacion}</p>}

      <div className="mt-4 pt-3 border-t border-[#EDE9E0]">
        <p className="flex items-center gap-1.5 text-xs text-[#7A7A7A] uppercase tracking-wider mb-2"><FlaskConical size={13} /> Agregar receta usada</p>
        <select value={recetaId} onChange={(e) => setRecetaId(e.target.value)} className={INPUT + " mb-2"}>
          <option value="">Elegir receta…</option>
          {recetas.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <input type="number" step="0.01" value={cant} onChange={(e) => setCant(e.target.value)} className="w-24 border border-[#EDE9E0] px-2 py-2 text-sm focus:outline-none focus:border-[#C9A84C]" />
          <span className="text-xs text-[#7A7A7A]">{rec?.unidad || "u"}</span>
          <button onClick={agregar} disabled={!recetaId || busy} className={BTN + " ml-auto"}>
            {ok ? <><Check size={14} /> Listo</> : <><Plus size={14} /> Agregar</>}
          </button>
        </div>
      </div>
    </div>
  );
}
