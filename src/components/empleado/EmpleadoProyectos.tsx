"use client";

import { useState } from "react";
import { Plus, MapPin, FlaskConical, Check } from "lucide-react";

interface Proy { id: string; nombre: string; ubicacion: string; estado: string }
interface Rec { id: string; nombre: string; unidad: string; rendimiento: string }

const CARD = "bg-white border border-[#EDE9E0]";
const INPUT = "w-full border border-[#EDE9E0] bg-white px-3 py-2 text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A84C]";
const BTN = "flex items-center gap-2 bg-[#1B2A5E] text-[#F5F2EC] px-4 py-2.5 text-xs tracking-widest uppercase font-semibold hover:bg-[#243470] disabled:opacity-60";
const ESTADO_CLS: Record<string, string> = {
  activo: "bg-green-50 text-green-700 border-green-200",
  finalizado: "bg-[#F5F2EC] text-[#7A7A7A] border-[#EDE9E0]",
  futuro: "bg-[#1B2A5E]/5 text-[#1B2A5E] border-[#1B2A5E]/20",
};

export default function EmpleadoProyectos({ proyectos, recetas }: { proyectos: Proy[]; recetas: Rec[] }) {
  return (
    <div>
      <div className="mb-5">
        <p className="text-sm text-[#7A7A7A]">Tus proyectos asignados. Agrega las recetas que uses en cada uno.</p>
      </div>

      {proyectos.length === 0 ? (
        <div className={`${CARD} py-14 px-6 text-center text-sm text-[#7A7A7A]`}>Todavía no tienes proyectos asignados. La administración los asigna.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {proyectos.map((p) => <ProyectoCard key={p.id} proyecto={p} recetas={recetas} />)}
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
