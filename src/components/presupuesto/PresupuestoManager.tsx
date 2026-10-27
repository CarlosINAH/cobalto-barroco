"use client";

import { useMemo, useState } from "react";
import {
  Plus, Trash2, Save, FileText, Download, Send, Check, Ban,
  ClipboardList, Layers, ArrowLeft,
} from "lucide-react";
import type { Budget, BudgetLine, BudgetEstado, Project } from "@/lib/db";
import CatalogosManager from "@/components/costos/CatalogosManager";

const mxn = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 });
const money = (n: number) => mxn.format(Number.isFinite(n) ? n : 0);
const fecha = (ms?: number) => (ms ? new Date(ms).toLocaleDateString("es-MX") : "—");

const CARD = "bg-white border border-[#EDE9E0]";
const INPUT = "w-full border border-[#EDE9E0] bg-white px-3 py-2 text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A84C]";
const LABEL = "block text-xs text-[#7A7A7A] uppercase tracking-wider mb-1";
const BTN = "flex items-center gap-2 bg-[#1B2A5E] text-[#F5F2EC] px-4 py-2.5 text-xs tracking-widest uppercase font-semibold hover:bg-[#243470] disabled:opacity-60";
const BTN_GHOST = "flex items-center gap-2 border border-[#EDE9E0] px-3 py-2 text-xs tracking-wider uppercase font-semibold text-[#1B2A5E] hover:border-[#C9A84C]";

const ESTADO_CLS: Record<BudgetEstado, string> = {
  borrador: "bg-[#F5F2EC] text-[#7A7A7A] border-[#EDE9E0]",
  enviado: "bg-[#1B2A5E]/5 text-[#1B2A5E] border-[#1B2A5E]/20",
  aprobado: "bg-green-50 text-green-700 border-green-200",
  rechazado: "bg-red-50 text-red-600 border-red-200",
};
const ESTADO_LABEL: Record<BudgetEstado, string> = {
  borrador: "Borrador", enviado: "Enviado", aprobado: "Aprobado", rechazado: "Rechazado",
};

export type ConceptoPick = {
  id: string; clave: string; concepto: string; descripcion: string;
  unidad: string; pu: number; tiempoPU?: number | null;
};

type CatalogProps = React.ComponentProps<typeof CatalogosManager>;

export default function PresupuestoManager({
  budgets, conceptos, projects, catalog,
}: {
  budgets: Budget[];
  conceptos: ConceptoPick[];
  projects: Project[];
  catalog: CatalogProps;
}) {
  const [tab, setTab] = useState<"presupuestos" | "catalogos">("presupuestos");

  return (
    <div>
      <div className="flex gap-1 border-b border-[#EDE9E0] mb-6">
        {([["presupuestos", "Presupuestos", ClipboardList], ["catalogos", "Catálogos", Layers]] as const).map(([id, label, Icon]) => {
          const on = tab === id;
          return (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs tracking-wider uppercase font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors ${on ? "border-[#C9A84C] text-[#1B2A5E]" : "border-transparent text-[#7A7A7A] hover:text-[#1B2A5E]"}`}>
              <Icon size={14} /> {label}
            </button>
          );
        })}
      </div>

      {tab === "presupuestos"
        ? <Presupuestos budgets={budgets} conceptos={conceptos} projects={projects} />
        : <CatalogosManager {...catalog} />}
    </div>
  );
}

function Presupuestos({ budgets, conceptos, projects }: { budgets: Budget[]; conceptos: ConceptoPick[]; projects: Project[] }) {
  const [items, setItems] = useState<Budget[]>(budgets);
  const [selId, setSelId] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<"" | BudgetEstado>("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ obra: "", cliente: "" });
  const [busy, setBusy] = useState(false);

  const sel = items.find((b) => b.id === selId) || null;
  const subtotalDe = (b: Budget) => b.lineas.reduce((a, l) => a + l.pu * l.cantidad, 0);
  const totalDe = (b: Budget) => subtotalDe(b) * (1 + (b.factorIva ?? 0.16));

  const visibles = useMemo(
    () => items.filter((b) => !filtro || (b.estado || "borrador") === filtro),
    [items, filtro],
  );

  async function crear() {
    if (!form.obra.trim() && !form.cliente.trim()) return;
    setBusy(true);
    const res = await fetch("/api/costos/budgets", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: form.obra.trim() || "Presupuesto", obra: form.obra.trim(), cliente: form.cliente.trim(), lineas: [] }),
    });
    setBusy(false);
    if (!res.ok) return;
    const { budget } = await res.json();
    setItems((xs) => [budget, ...xs]);
    setOpen(false); setForm({ obra: "", cliente: "" });
    setSelId(budget.id);
  }
  function patchLocal(b: Budget) { setItems((xs) => xs.map((x) => (x.id === b.id ? b : x))); }
  async function setEstado(b: Budget, estado: BudgetEstado) {
    const msg = estado === "aprobado" ? "Aprobar este presupuesto y crearlo como proyecto activo?" : null;
    if (msg && !confirm(msg)) return;
    const res = await fetch(`/api/costos/budgets/${b.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
    if (!res.ok) return;
    const { budget } = await res.json();
    patchLocal(budget);
  }
  async function borrar(id: string) {
    if (!confirm("¿Eliminar este presupuesto?")) return;
    if ((await fetch(`/api/costos/budgets/${id}`, { method: "DELETE" })).ok)
      setItems((xs) => xs.filter((x) => x.id !== id));
  }

  if (sel) {
    return (
      <Builder
        budget={sel}
        conceptos={conceptos}
        onBack={() => setSelId(null)}
        onChange={patchLocal}
      />
    );
  }

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <div className="flex items-center gap-3">
          <select value={filtro} onChange={(e) => setFiltro(e.target.value as "" | BudgetEstado)} className={INPUT + " w-44"}>
            <option value="">Todos los estados</option>
            <option value="borrador">Borrador</option>
            <option value="enviado">Enviado</option>
            <option value="aprobado">Aprobado</option>
            <option value="rechazado">Rechazado</option>
          </select>
          <span className="text-sm text-[#7A7A7A]">{visibles.length} presupuestos</span>
        </div>
        <button onClick={() => setOpen((v) => !v)} className={BTN}><Plus size={14} /> Nuevo presupuesto</button>
      </div>

      {open && (
        <div className={`${CARD} p-5 mb-4`}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className={LABEL}>Obra / trabajo</label><input className={INPUT} value={form.obra} onChange={(e) => setForm({ ...form, obra: e.target.value })} placeholder="p. ej. Restauración vitrales" /></div>
            <div><label className={LABEL}>Cliente</label><input className={INPUT} value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })} /></div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={crear} disabled={busy} className={BTN}><Save size={14} /> Crear y armar</button>
            <button onClick={() => setOpen(false)} className="px-4 py-2.5 text-xs tracking-widest uppercase text-[#7A7A7A] hover:text-[#1B2A5E]">Cancelar</button>
          </div>
        </div>
      )}

      <div className={`${CARD} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[#7A7A7A] text-xs uppercase tracking-wider border-b border-[#EDE9E0]">
              <th className="px-3 py-3 font-semibold">Obra</th>
              <th className="px-3 py-3 font-semibold">Cliente</th>
              <th className="px-3 py-3 font-semibold">Estado</th>
              <th className="px-3 py-3 font-semibold">Creado</th>
              <th className="px-3 py-3 font-semibold">Enviado</th>
              <th className="px-3 py-3 font-semibold text-right">Total</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {visibles.map((b) => {
              const est = (b.estado || "borrador") as BudgetEstado;
              const proj = projects.find((p) => p.id === b.projectId);
              return (
                <tr key={b.id} className="border-b border-[#F5F2EC] hover:bg-[#F5F2EC]/50">
                  <td className="px-3 py-2 text-[#2C2C2C]">
                    <button onClick={() => setSelId(b.id)} className="text-left hover:text-[#1B2A5E] font-medium">{b.obra || b.nombre}</button>
                    {proj && <span className="block text-[11px] text-green-700">→ proyecto activo</span>}
                  </td>
                  <td className="px-3 py-2 text-[#7A7A7A]">{b.cliente || "—"}</td>
                  <td className="px-3 py-2"><span className={`text-xs px-2 py-0.5 border ${ESTADO_CLS[est]}`}>{ESTADO_LABEL[est]}</span></td>
                  <td className="px-3 py-2 text-[#7A7A7A] whitespace-nowrap">{fecha(b.createdAt)}</td>
                  <td className="px-3 py-2 text-[#7A7A7A] whitespace-nowrap">{fecha(b.enviadoEn)}</td>
                  <td className="px-3 py-2 text-right data-label whitespace-nowrap">{money(totalDe(b))}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <a href={`/api/costos/budgets/${b.id}/pdf`} target="_blank" rel="noopener noreferrer" className="text-[#7A7A7A] hover:text-[#1B2A5E]" title="PDF"><FileText size={15} /></a>
                      {est === "borrador" && <button onClick={() => setEstado(b, "enviado")} className="text-[#7A7A7A] hover:text-[#1B2A5E]" title="Marcar como enviado"><Send size={15} /></button>}
                      {(est === "borrador" || est === "enviado") && <button onClick={() => setEstado(b, "aprobado")} className="text-[#7A7A7A] hover:text-green-600" title="Aprobar → proyecto"><Check size={15} /></button>}
                      {(est === "borrador" || est === "enviado") && <button onClick={() => setEstado(b, "rechazado")} className="text-[#7A7A7A] hover:text-red-500" title="Rechazar"><Ban size={15} /></button>}
                      <button onClick={() => borrar(b.id)} className="text-[#7A7A7A] hover:text-red-500" title="Eliminar"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {visibles.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-12 text-center text-[#7A7A7A]"><ClipboardList size={20} className="mx-auto mb-2 opacity-40" />Sin presupuestos. Crea el primero.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const LINE_EMPTY = (): BudgetLine => ({ conceptId: null, clave: "", concepto: "", descripcion: "", unidad: "", pu: 0, cantidad: 1, tiempoPU: null });

function Builder({ budget, conceptos, onBack, onChange }: {
  budget: Budget; conceptos: ConceptoPick[]; onBack: () => void; onChange: (b: Budget) => void;
}) {
  const [lineas, setLineas] = useState<BudgetLine[]>(budget.lineas);
  const [cliente, setCliente] = useState(budget.cliente);
  const [obra, setObra] = useState(budget.obra || "");
  const [nueva, setNueva] = useState<BudgetLine>(LINE_EMPTY());
  const [busy, setBusy] = useState(false);
  const [guardado, setGuardado] = useState(true);

  const iva = budget.factorIva ?? 0.16;
  const subtotal = lineas.reduce((a, l) => a + l.pu * l.cantidad, 0);
  const total = subtotal * (1 + iva);

  function pickConcepto(id: string) {
    const c = conceptos.find((x) => x.id === id);
    if (!c) { setNueva({ ...nueva, conceptId: null }); return; }
    setNueva({ conceptId: c.id, clave: c.clave, concepto: c.concepto, descripcion: c.descripcion, unidad: c.unidad, pu: c.pu, cantidad: nueva.cantidad || 1, tiempoPU: c.tiempoPU ?? null });
  }
  function agregar() {
    if (!nueva.concepto.trim() && !nueva.clave.trim()) return;
    setLineas((xs) => [...xs, { ...nueva }]);
    setNueva(LINE_EMPTY()); setGuardado(false);
  }
  function quitar(i: number) { setLineas((xs) => xs.filter((_, j) => j !== i)); setGuardado(false); }
  function editCant(i: number, v: number) { setLineas((xs) => xs.map((l, j) => (j === i ? { ...l, cantidad: v } : l))); setGuardado(false); }

  async function guardar() {
    setBusy(true);
    const res = await fetch(`/api/costos/budgets/${budget.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lineas, cliente, obra }),
    });
    setBusy(false);
    if (!res.ok) return;
    const { budget: nb } = await res.json();
    onChange(nb); setGuardado(true);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-[#7A7A7A] hover:text-[#1B2A5E]"><ArrowLeft size={16} /> Presupuestos</button>
        <div className="flex items-center gap-2">
          <a href={`/api/costos/budgets/${budget.id}/pdf`} target="_blank" rel="noopener noreferrer" className={BTN_GHOST}><Download size={14} /> PDF</a>
          <button onClick={guardar} disabled={busy} className={BTN}><Save size={14} /> {guardado ? "Guardado" : "Guardar"}</button>
        </div>
      </div>

      <div className={`${CARD} p-5 mb-4 grid gap-3 sm:grid-cols-2`}>
        <div><label className={LABEL}>Obra / trabajo</label><input className={INPUT} value={obra} onChange={(e) => { setObra(e.target.value); setGuardado(false); }} /></div>
        <div><label className={LABEL}>Cliente</label><input className={INPUT} value={cliente} onChange={(e) => { setCliente(e.target.value); setGuardado(false); }} /></div>
      </div>

      <div className={`${CARD} p-5 mb-4`}>
        <p className="text-xs uppercase tracking-wider text-[#1B2A5E] font-semibold mb-3">Agregar partida</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <label className={LABEL}>Concepto del catálogo</label>
            <select className={INPUT} value={nueva.conceptId || ""} onChange={(e) => pickConcepto(e.target.value)}>
              <option value="">— manual —</option>
              {conceptos.map((c) => <option key={c.id} value={c.id}>{c.clave ? `${c.clave} · ` : ""}{c.concepto}</option>)}
            </select>
          </div>
          <div><label className={LABEL}>Clave</label><input className={INPUT} value={nueva.clave} onChange={(e) => setNueva({ ...nueva, clave: e.target.value })} /></div>
          <div className="lg:col-span-2"><label className={LABEL}>Concepto</label><input className={INPUT} value={nueva.concepto} onChange={(e) => setNueva({ ...nueva, concepto: e.target.value })} /></div>
          <div><label className={LABEL}>Unidad</label><input className={INPUT} value={nueva.unidad} onChange={(e) => setNueva({ ...nueva, unidad: e.target.value })} /></div>
          <div><label className={LABEL}>P.U.</label><input type="number" step="0.01" className={INPUT} value={nueva.pu || ""} onChange={(e) => setNueva({ ...nueva, pu: Number(e.target.value) || 0 })} /></div>
          <div><label className={LABEL}>Cantidad</label><input type="number" step="0.01" className={INPUT} value={nueva.cantidad || ""} onChange={(e) => setNueva({ ...nueva, cantidad: Number(e.target.value) || 0 })} /></div>
          <div className="flex items-end"><button onClick={agregar} className={BTN + " w-full justify-center"}><Plus size={14} /> Agregar</button></div>
        </div>
      </div>

      <div className={`${CARD} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[#7A7A7A] text-xs uppercase tracking-wider border-b border-[#EDE9E0]">
              <th className="px-3 py-3 font-semibold">Clave</th>
              <th className="px-3 py-3 font-semibold">Concepto</th>
              <th className="px-3 py-3 font-semibold">Unidad</th>
              <th className="px-3 py-3 font-semibold text-right">P.U.</th>
              <th className="px-3 py-3 font-semibold text-right">Cant.</th>
              <th className="px-3 py-3 font-semibold text-right">Subtotal</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {lineas.map((l, i) => (
              <tr key={i} className="border-b border-[#F5F2EC]">
                <td className="px-3 py-2 text-[#7A7A7A] whitespace-nowrap">{l.clave || "—"}</td>
                <td className="px-3 py-2 text-[#2C2C2C]">{l.concepto || "—"}</td>
                <td className="px-3 py-2 text-[#7A7A7A]">{l.unidad || "—"}</td>
                <td className="px-3 py-2 text-right data-label whitespace-nowrap">{money(l.pu)}</td>
                <td className="px-3 py-2 text-right w-24"><input type="number" step="0.01" value={l.cantidad} onChange={(e) => editCant(i, Number(e.target.value) || 0)} className={INPUT + " text-right py-1"} /></td>
                <td className="px-3 py-2 text-right data-label whitespace-nowrap">{money(l.pu * l.cantidad)}</td>
                <td className="px-3 py-2 text-right"><button onClick={() => quitar(i)} className="text-[#7A7A7A] hover:text-red-500"><Trash2 size={14} /></button></td>
              </tr>
            ))}
            {lineas.length === 0 && <tr><td colSpan={7} className="px-3 py-10 text-center text-[#7A7A7A]">Sin partidas. Agrega la primera arriba.</td></tr>}
          </tbody>
          {lineas.length > 0 && (
            <tfoot>
              <tr className="border-t border-[#EDE9E0]"><td colSpan={5} className="px-3 py-2 text-right text-[#7A7A7A]">Subtotal</td><td className="px-3 py-2 text-right data-label">{money(subtotal)}</td><td /></tr>
              <tr><td colSpan={5} className="px-3 py-2 text-right text-[#7A7A7A]">IVA {Math.round(iva * 100)}%</td><td className="px-3 py-2 text-right data-label">{money(subtotal * iva)}</td><td /></tr>
              <tr><td colSpan={5} className="px-3 py-2 text-right text-[#1B2A5E] font-semibold">Total</td><td className="px-3 py-2 text-right data-label text-[#1B2A5E] font-semibold">{money(total)}</td><td /></tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
