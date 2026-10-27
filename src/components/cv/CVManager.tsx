"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, Save, Pencil, X, Download, Award, MapPin } from "lucide-react";
import type { CVEntry } from "@/lib/db";

const CARD = "bg-white border border-[#EDE9E0]";
const INPUT = "w-full border border-[#EDE9E0] bg-white px-3 py-2 text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A84C]";
const LABEL = "block text-xs text-[#7A7A7A] uppercase tracking-wider mb-1";
const BTN = "flex items-center gap-2 bg-[#1B2A5E] text-[#F5F2EC] px-4 py-2.5 text-xs tracking-widest uppercase font-semibold hover:bg-[#243470] disabled:opacity-60";

type Form = {
  id: string | null; clave: string; anio: string; fecha: string;
  clasificacion: string; tipoBien: string; lugar: string; sitio: string;
  titulo: string; descripcion: string; colaboracion: string;
};
const EMPTY = (): Form => ({
  id: null, clave: "", anio: String(new Date().getFullYear()), fecha: "",
  clasificacion: "", tipoBien: "", lugar: "", sitio: "", titulo: "", descripcion: "", colaboracion: "",
});

export default function CVManager({ initial, canWrite }: { initial: CVEntry[]; canWrite: boolean }) {
  const [items, setItems] = useState<CVEntry[]>(initial);
  const [form, setForm] = useState<Form>(EMPTY());
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  const grupos = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filt = items.filter((e) =>
      !needle || `${e.clave} ${e.titulo} ${e.sitio} ${e.lugar} ${e.tipoBien} ${e.descripcion}`.toLowerCase().includes(needle),
    );
    const g = new Map<number, CVEntry[]>();
    for (const e of filt) (g.get(e.anio) || g.set(e.anio, []).get(e.anio)!).push(e);
    return [...g.entries()].sort((a, b) => b[0] - a[0]);
  }, [items, q]);

  function nuevo() { setForm(EMPTY()); setError(""); setOpen(true); }
  function editar(e: CVEntry) {
    setForm({
      id: e.id, clave: e.clave || "", anio: String(e.anio), fecha: e.fecha || "",
      clasificacion: e.clasificacion || "", tipoBien: e.tipoBien || "", lugar: e.lugar || "",
      sitio: e.sitio || "", titulo: e.titulo, descripcion: e.descripcion || "", colaboracion: e.colaboracion || "",
    });
    setError(""); setOpen(true);
  }
  async function guardar() {
    if (!form.titulo.trim()) { setError("El título es obligatorio."); return; }
    setBusy(true); setError("");
    const payload = { ...form, anio: Number(form.anio) || new Date().getFullYear() };
    const res = await fetch(form.id ? `/api/cv/${form.id}` : "/api/cv", {
      method: form.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    setBusy(false);
    if (!res.ok) { setError("No se pudo guardar."); return; }
    const { entry } = await res.json();
    setItems((xs) => (form.id ? xs.map((x) => (x.id === entry.id ? entry : x)) : [...xs, entry]));
    setOpen(false);
  }
  async function borrar(id: string) {
    if (!confirm("¿Eliminar esta entrada del currículum?")) return;
    if ((await fetch(`/api/cv/${id}`, { method: "DELETE" })).ok) setItems((xs) => xs.filter((x) => x.id !== id));
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <p className="text-sm text-[#7A7A7A] max-w-xl">
          Currículum de la empresa: participación en proyectos de restauración. Se
          captura en equipo y cada obra que se marca <b>finalizada</b> se suma aquí.
        </p>
        <div className="flex items-center gap-2">
          <a href="/api/cv/pdf" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 border border-[#EDE9E0] text-[#1B2A5E] px-3 py-2 text-xs tracking-wider uppercase font-semibold hover:border-[#C9A84C]"><Download size={14} /> PDF</a>
          {canWrite && <button onClick={nuevo} className={BTN}><Plus size={14} /> Nueva entrada</button>}
        </div>
      </div>

      <div className="relative mb-5 max-w-md">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar en el CV…" className={INPUT} />
      </div>

      {open && canWrite && (
        <div className={`${CARD} p-5 mb-5`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[#1B2A5E] font-semibold" style={{ fontFamily: "var(--font-playfair)" }}>{form.id ? "Editar entrada" : "Nueva entrada"}</h3>
            <button onClick={() => setOpen(false)} className="text-[#7A7A7A] hover:text-[#1B2A5E]"><X size={18} /></button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div><label className={LABEL}>Clave</label><input className={INPUT} value={form.clave} onChange={(e) => setForm({ ...form, clave: e.target.value })} placeholder="CB001" /></div>
            <div><label className={LABEL}>Año</label><input type="number" className={INPUT} value={form.anio} onChange={(e) => setForm({ ...form, anio: e.target.value })} /></div>
            <div><label className={LABEL}>Fecha / periodo</label><input className={INPUT} value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} placeholder="MAYO - JULIO" /></div>
            <div><label className={LABEL}>Clasificación</label><input className={INPUT} list="cv-clasif" value={form.clasificacion} onChange={(e) => setForm({ ...form, clasificacion: e.target.value })} placeholder="HISTÓRICO / MODERNO" />
              <datalist id="cv-clasif"><option value="HISTÓRICO" /><option value="MODERNO" /></datalist>
            </div>
            <div><label className={LABEL}>Tipo de bien</label><input className={INPUT} value={form.tipoBien} onChange={(e) => setForm({ ...form, tipoBien: e.target.value })} placeholder="VITRAL, RETABLO…" /></div>
            <div><label className={LABEL}>Lugar</label><input className={INPUT} value={form.lugar} onChange={(e) => setForm({ ...form, lugar: e.target.value })} placeholder="CENTRO, CDMX" /></div>
            <div className="sm:col-span-2"><label className={LABEL}>Inmueble / sitio</label><input className={INPUT} value={form.sitio} onChange={(e) => setForm({ ...form, sitio: e.target.value })} placeholder="MUSEO NACIONAL DE ARTE" /></div>
            <div className="sm:col-span-2 lg:col-span-4"><label className={LABEL}>Título del proyecto *</label><input className={INPUT} value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></div>
            <div className="sm:col-span-2 lg:col-span-4"><label className={LABEL}>Descripción</label><textarea className={INPUT + " min-h-[70px]"} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} /></div>
            <div className="sm:col-span-2 lg:col-span-4"><label className={LABEL}>Colaboración</label><input className={INPUT} value={form.colaboracion} onChange={(e) => setForm({ ...form, colaboracion: e.target.value })} placeholder="COLABORACIÓN CON…" /></div>
          </div>
          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
          <div className="flex gap-2 mt-4">
            <button onClick={guardar} disabled={busy} className={BTN}><Save size={14} /> Guardar</button>
            <button onClick={() => setOpen(false)} className="px-4 py-2.5 text-xs tracking-widest uppercase text-[#7A7A7A] hover:text-[#1B2A5E]">Cancelar</button>
          </div>
        </div>
      )}

      {grupos.length === 0 ? (
        <div className={`${CARD} py-16 text-center text-sm text-[#7A7A7A]`}>
          <Award size={28} className="mx-auto mb-3 text-[#EDE9E0]" />
          {items.length === 0 ? "Aún no hay intervenciones en el currículum." : "Sin resultados para la búsqueda."}
        </div>
      ) : grupos.map(([anio, entries]) => (
        <div key={anio} className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <h3 className="text-[#1B2A5E] text-xl" style={{ fontFamily: "var(--font-playfair)" }}>{anio}</h3>
            <span className="text-xs text-[#7A7A7A]">{entries.length} intervención(es)</span>
            <div className="flex-1 h-px bg-[#EDE9E0]" />
          </div>
          <div className="space-y-3">
            {entries.map((e) => (
              <div key={e.id} className={`${CARD} p-4 group`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="text-[#1B2A5E] font-semibold leading-tight">
                      {e.clave && <span className="data-label text-[#7A7A7A] mr-2">{e.clave}</span>}
                      {e.titulo}
                    </h4>
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[#7A7A7A] mt-1">
                      {e.sitio && <span className="text-[#2C2C2C]">{e.sitio}</span>}
                      {e.lugar && <span className="flex items-center gap-1"><MapPin size={11} /> {e.lugar}</span>}
                      {e.tipoBien && <span>{e.tipoBien}</span>}
                      {e.clasificacion && <span className="uppercase">{e.clasificacion}</span>}
                      {e.fecha && <span className="data-label">{e.fecha}</span>}
                      {e.projectId && <span className="text-green-700">· obra finalizada</span>}
                    </p>
                  </div>
                  {canWrite && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => editar(e)} className="text-[#7A7A7A] hover:text-[#1B2A5E]"><Pencil size={15} /></button>
                      <button onClick={() => borrar(e.id)} className="text-[#7A7A7A] hover:text-red-500"><Trash2 size={15} /></button>
                    </div>
                  )}
                </div>
                {e.descripcion && <p className="text-sm text-[#555] mt-2">{e.descripcion}</p>}
                {e.colaboracion && <p className="text-xs text-[#7A7A7A] mt-1 italic">{e.colaboracion}</p>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
