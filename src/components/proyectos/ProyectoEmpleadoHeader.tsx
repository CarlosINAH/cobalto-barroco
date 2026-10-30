"use client";

import { useState } from "react";
import { MapPin, Pencil, Save, X, Loader2, LayoutGrid } from "lucide-react";
import CarpetaInformesPicker from "@/components/proyectos/CarpetaInformesPicker";

interface Proyecto {
  id: string;
  nombre: string;
  ubicacion: string;
  estado: string;
  avance: number;
  inicio: string;
  entrega: string;
  desc: string;
  carpetaInformes?: string;
}

const ESTADO_CLS: Record<string, string> = {
  activo: "bg-green-50 text-green-700 border-green-200",
  finalizado: "bg-[#F5F2EC] text-[#7A7A7A] border-[#EDE9E0]",
  futuro: "bg-[#1B2A5E]/5 text-[#1B2A5E] border-[#1B2A5E]/20",
};
const INPUT = "w-full border border-[#EDE9E0] bg-white px-3 py-2 text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A84C]";
const LABEL = "block text-xs text-[#7A7A7A] uppercase tracking-wider mb-1";

/** Encabezado del proyecto en el panel del empleado. Si `canEdit`, permite
 *  editar la información (sin montos) y elegir la carpeta de informes. */
export default function ProyectoEmpleadoHeader({ proyecto, canEdit }: { proyecto: Proyecto; canEdit: boolean }) {
  const [p, setP] = useState<Proyecto>(proyecto);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState(proyecto);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function guardar() {
    setBusy(true); setError("");
    try {
      const res = await fetch(`/api/projects/${p.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ubicacion: form.ubicacion, estado: form.estado,
          avance: form.avance, inicio: form.inicio, entrega: form.entrega, desc: form.desc,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "No se pudo guardar."); return; }
      setP((x) => ({ ...x, ...form }));
      setEdit(false);
    } catch {
      setError("Error de conexión.");
    } finally {
      setBusy(false);
    }
  }

  const est = ESTADO_CLS[p.estado] || "";

  if (edit) {
    return (
      <div className="bg-white border border-[#EDE9E0] p-5 mb-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className={LABEL}>Ubicación</label><input className={INPUT} value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} /></div>
          <div>
            <label className={LABEL}>Estado</label>
            <select className={INPUT} value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
              <option value="activo">Activo</option>
              <option value="finalizado">Finalizado</option>
              <option value="futuro">Futuro</option>
            </select>
          </div>
          <div><label className={LABEL}>Inicio</label><input type="date" className={INPUT} value={form.inicio} onChange={(e) => setForm({ ...form, inicio: e.target.value })} /></div>
          <div><label className={LABEL}>Entrega</label><input type="date" className={INPUT} value={form.entrega} onChange={(e) => setForm({ ...form, entrega: e.target.value })} /></div>
          <div><label className={LABEL}>Avance (%)</label><input type="number" min="0" max="100" className={INPUT} value={form.avance} onChange={(e) => setForm({ ...form, avance: Number(e.target.value) || 0 })} /></div>
          <div className="sm:col-span-2"><label className={LABEL}>Descripción</label><textarea rows={2} className={INPUT + " resize-y"} value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} /></div>
        </div>
        {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
        <div className="flex gap-2 mt-4">
          <button onClick={guardar} disabled={busy} className="flex items-center gap-2 bg-[#1B2A5E] text-[#F5F2EC] px-4 py-2 text-xs tracking-widest uppercase font-semibold hover:bg-[#243470] disabled:opacity-60">
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Guardar
          </button>
          <button onClick={() => { setForm(p); setEdit(false); setError(""); }} className="flex items-center gap-1 px-4 py-2 text-xs tracking-widest uppercase text-[#7A7A7A] hover:text-[#1B2A5E]"><X size={13} /> Cancelar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#EDE9E0] p-5 mb-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-[#1B2A5E] text-2xl" style={{ fontFamily: "var(--font-playfair)" }}>{p.nombre}</h2>
          {p.ubicacion && <p className="flex items-center gap-1 text-sm text-[#7A7A7A] mt-1"><MapPin size={13} /> {p.ubicacion}</p>}
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <span className={`text-xs px-2 py-1 border ${est}`}>{p.estado}</span>
          {canEdit && (
            <>
              <button onClick={() => { setForm(p); setEdit(true); }} className="flex items-center gap-1 text-xs text-[#7A7A7A] hover:text-[#1B2A5E] border border-[#EDE9E0] px-2 py-1 hover:border-[#C9A84C]">
                <Pencil size={12} /> Editar
              </button>
              <a href="/dashboard/admin/proyectos" className="flex items-center gap-1 text-xs bg-[#1B2A5E] text-[#F5F2EC] px-2.5 py-1 hover:bg-[#243470]">
                <LayoutGrid size={12} /> Espacio de trabajo
              </a>
            </>
          )}
        </div>
      </div>
      <div className="mt-4 h-1.5 bg-[#F5F2EC] overflow-hidden max-w-sm">
        <div className="h-full bg-[#C9A84C]" style={{ width: `${Math.min(100, Math.max(0, p.avance))}%` }} />
      </div>
      <p className="text-xs text-[#7A7A7A] mt-1 data-label">{p.avance}% avance</p>
      {p.desc && <p className="text-sm text-[#555] mt-3">{p.desc}</p>}

      {canEdit ? (
        <div className="mt-4 pt-4 border-t border-[#EDE9E0]">
          <CarpetaInformesPicker projectId={p.id} projectNombre={p.nombre} initial={p.carpetaInformes || ""} />
        </div>
      ) : p.carpetaInformes ? (
        <p className="text-xs text-[#7A7A7A] mt-3">Informes: <span className="text-[#2C2C2C]">{p.carpetaInformes}</span></p>
      ) : null}
    </div>
  );
}
