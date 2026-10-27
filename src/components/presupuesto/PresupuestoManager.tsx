"use client";

import { useMemo, useState } from "react";
import {
  Plus, Trash2, Save, FileText, Download, Send, Check, Ban,
  ClipboardList, Layers, ArrowLeft, Search, ShoppingCart, Package, FlaskConical, Coins,
} from "lucide-react";
import type {
  Budget, BudgetLine, BudgetEstado, Project,
  CostMaterial, Recipe, LaborRate,
} from "@/lib/db";
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

export type CatalogProps = React.ComponentProps<typeof CatalogosManager>;

export default function PresupuestoManager({
  budgets, conceptos, projects, catalog,
}: {
  budgets: Budget[];
  conceptos: ConceptoPick[];
  projects: Project[];
  catalog: CatalogProps;
}) {
  // El catálogo se administra en su propia pestaña (junto a Proyectos y
  // Presupuesto); aquí solo se arman y gestionan los presupuestos.
  return <Presupuestos budgets={budgets} conceptos={conceptos} projects={projects} catalog={catalog} />;
}

function Presupuestos({ budgets, conceptos, projects, catalog }: { budgets: Budget[]; conceptos: ConceptoPick[]; projects: Project[]; catalog: CatalogProps }) {
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
        catalog={catalog}
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

type CatTab = "conceptos" | "materiales" | "recetas" | "personal";
const CAT_TABS: { id: CatTab; label: string; icon: React.ElementType }[] = [
  { id: "conceptos", label: "Conceptos", icon: Layers },
  { id: "materiales", label: "Materiales", icon: Package },
  { id: "recetas", label: "Recetas", icon: FlaskConical },
  { id: "personal", label: "Personal", icon: Coins },
];

/** Clave de una línea para detectar duplicados (y sumar cantidades). */
function lineKey(l: BudgetLine): string {
  return l.conceptId || `${l.clave}|${l.concepto}|${l.pu}`;
}

export function Builder({ budget, conceptos, catalog, onBack, onChange }: {
  budget: Budget; conceptos: ConceptoPick[]; catalog: CatalogProps;
  onBack?: () => void; onChange: (b: Budget) => void;
}) {
  const [lineas, setLineas] = useState<BudgetLine[]>(budget.lineas);
  const [cliente, setCliente] = useState(budget.cliente);
  const [obra, setObra] = useState(budget.obra || "");
  const [busy, setBusy] = useState(false);
  const [guardado, setGuardado] = useState(true);
  const [catTab, setCatTab] = useState<CatTab>("conceptos");
  const [q, setQ] = useState("");

  const iva = budget.factorIva ?? 0.16;
  const subtotal = lineas.reduce((a, l) => a + l.pu * l.cantidad, 0);
  const total = subtotal * (1 + iva);

  /** Agrega una partida; si ya existe la misma, suma 1 a su cantidad. */
  function addLine(line: BudgetLine) {
    setLineas((xs) => {
      const k = lineKey(line);
      const i = xs.findIndex((l) => lineKey(l) === k);
      if (i >= 0) return xs.map((l, j) => (j === i ? { ...l, cantidad: l.cantidad + 1 } : l));
      return [...xs, line];
    });
    setGuardado(false);
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

  // ── Catálogo filtrado por búsqueda ──
  const nq = q.trim().toLowerCase();
  const fConceptos = useMemo(
    () => conceptos.filter((c) => !nq || `${c.clave} ${c.concepto} ${c.descripcion}`.toLowerCase().includes(nq)),
    [conceptos, nq],
  );
  const fMateriales = useMemo(
    () => catalog.materiales.filter((m) => !nq || `${m.nombre} ${m.categoria}`.toLowerCase().includes(nq)),
    [catalog.materiales, nq],
  );
  const fRecetas = useMemo(
    () => catalog.recetas.filter((r) => !nq || r.nombre.toLowerCase().includes(nq)),
    [catalog.recetas, nq],
  );
  const fSalarios = useMemo(
    () => catalog.salarios.filter((s) => !nq || s.rol.toLowerCase().includes(nq)),
    [catalog.salarios, nq],
  );

  const addConcepto = (c: ConceptoPick) => addLine({ conceptId: c.id, clave: c.clave, concepto: c.concepto, descripcion: c.descripcion, unidad: c.unidad, pu: c.pu, cantidad: 1, tiempoPU: c.tiempoPU ?? null });
  const addMaterial = (m: CostMaterial) => addLine({ conceptId: null, clave: "MAT", concepto: m.nombre, descripcion: m.categoria || "", unidad: m.unidad, pu: m.precio, cantidad: 1, tiempoPU: null });
  const addReceta = (r: Recipe) => addLine({ conceptId: null, clave: "REC", concepto: r.nombre, descripcion: "", unidad: r.unidad, pu: r.costo, cantidad: 1, tiempoPU: null });
  const addSalario = (s: LaborRate) => addLine({ conceptId: null, clave: "M.O.", concepto: s.rol, descripcion: "Mano de obra", unidad: "jornada", pu: s.jornada, cantidad: 1, tiempoPU: null });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        {onBack
          ? <button onClick={onBack} className="flex items-center gap-2 text-sm text-[#7A7A7A] hover:text-[#1B2A5E]"><ArrowLeft size={16} /> Presupuestos</button>
          : <span />}
        <div className="flex items-center gap-2">
          <a href={`/api/costos/budgets/${budget.id}/pdf`} target="_blank" rel="noopener noreferrer" className={BTN_GHOST}><Download size={14} /> PDF</a>
          <button onClick={guardar} disabled={busy} className={BTN}><Save size={14} /> {guardado ? "Guardado" : "Guardar"}</button>
        </div>
      </div>

      <div className={`${CARD} p-5 mb-4 grid gap-3 sm:grid-cols-2`}>
        <div><label className={LABEL}>Obra / trabajo</label><input className={INPUT} value={obra} onChange={(e) => { setObra(e.target.value); setGuardado(false); }} /></div>
        <div><label className={LABEL}>Cliente</label><input className={INPUT} value={cliente} onChange={(e) => { setCliente(e.target.value); setGuardado(false); }} /></div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Catálogo (tienda) */}
        <div className={`${CARD} p-4 lg:col-span-3`}>
          <div className="flex items-center gap-2 mb-3">
            <ShoppingCart size={15} className="text-[#C9A84C]" />
            <span className="text-xs uppercase tracking-wider text-[#1B2A5E] font-semibold">Catálogo — agrega al presupuesto</span>
          </div>
          <div className="flex gap-1 border-b border-[#EDE9E0] mb-3 overflow-x-auto">
            {CAT_TABS.map((t) => {
              const Icon = t.icon; const on = catTab === t.id;
              return (
                <button key={t.id} onClick={() => setCatTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-[11px] tracking-wider uppercase font-semibold whitespace-nowrap border-b-2 -mb-px ${on ? "border-[#C9A84C] text-[#1B2A5E]" : "border-transparent text-[#7A7A7A] hover:text-[#1B2A5E]"}`}>
                  <Icon size={13} /> {t.label}
                </button>
              );
            })}
          </div>
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A7A7A]" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className={INPUT + " pl-9"} />
          </div>
          <div className="max-h-[22rem] overflow-y-auto divide-y divide-[#F5F2EC]">
            {catTab === "conceptos" && fConceptos.map((c) => (
              <ItemRow key={c.id} titulo={`${c.clave ? c.clave + " · " : ""}${c.concepto}`} sub={c.unidad} pu={c.pu} onAdd={() => addConcepto(c)} />
            ))}
            {catTab === "materiales" && fMateriales.map((m) => (
              <ItemRow key={m.id} titulo={m.nombre} sub={`${m.categoria || ""}${m.unidad ? " · " + m.unidad : ""}`} pu={m.precio} onAdd={() => addMaterial(m)} />
            ))}
            {catTab === "recetas" && fRecetas.map((r) => (
              <ItemRow key={r.id} titulo={r.nombre} sub={r.unidad} pu={r.costo} onAdd={() => addReceta(r)} />
            ))}
            {catTab === "personal" && fSalarios.map((s) => (
              <ItemRow key={s.id} titulo={s.rol} sub="jornada" pu={s.jornada} onAdd={() => addSalario(s)} />
            ))}
            {((catTab === "conceptos" && fConceptos.length === 0) ||
              (catTab === "materiales" && fMateriales.length === 0) ||
              (catTab === "recetas" && fRecetas.length === 0) ||
              (catTab === "personal" && fSalarios.length === 0)) && (
              <p className="py-8 text-center text-sm text-[#7A7A7A]">Sin resultados.</p>
            )}
          </div>
        </div>

        {/* Carrito (presupuesto) */}
        <div className={`${CARD} p-4 lg:col-span-2`}>
          <p className="text-xs uppercase tracking-wider text-[#1B2A5E] font-semibold mb-3">Presupuesto ({lineas.length})</p>
          {lineas.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#7A7A7A]">Agrega partidas desde el catálogo.</p>
          ) : (
            <div className="space-y-2 max-h-[20rem] overflow-y-auto pr-1">
              {lineas.map((l, i) => (
                <div key={i} className="flex items-center gap-2 border border-[#EDE9E0] p-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#2C2C2C] truncate">{l.concepto}</p>
                    <p className="text-[11px] text-[#7A7A7A]">{money(l.pu)}{l.unidad ? ` / ${l.unidad}` : ""}</p>
                  </div>
                  <input type="number" step="0.01" value={l.cantidad} onChange={(e) => editCant(i, Number(e.target.value) || 0)} className="w-16 border border-[#EDE9E0] px-2 py-1 text-sm text-right" />
                  <span className="w-24 text-right data-label text-sm">{money(l.pu * l.cantidad)}</span>
                  <button onClick={() => quitar(i)} className="text-[#7A7A7A] hover:text-red-500"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          )}
          <div className="border-t border-[#EDE9E0] mt-3 pt-3 space-y-1 text-sm">
            <div className="flex justify-between text-[#7A7A7A]"><span>Subtotal</span><span className="data-label">{money(subtotal)}</span></div>
            <div className="flex justify-between text-[#7A7A7A]"><span>IVA {Math.round(iva * 100)}%</span><span className="data-label">{money(subtotal * iva)}</span></div>
            <div className="flex justify-between text-[#1B2A5E] font-semibold"><span>Total</span><span className="data-label">{money(total)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ItemRow({ titulo, sub, pu, onAdd }: { titulo: string; sub?: string; pu: number; onAdd: () => void }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#2C2C2C] truncate">{titulo}</p>
        {sub && <p className="text-[11px] text-[#7A7A7A] truncate">{sub}</p>}
      </div>
      <span className="text-sm data-label text-[#1B2A5E] whitespace-nowrap">{money(pu)}</span>
      <button onClick={onAdd} className="flex items-center gap-1 bg-[#1B2A5E] text-[#F5F2EC] px-2.5 py-1.5 text-xs font-semibold hover:bg-[#243470]" title="Agregar al presupuesto">
        <Plus size={13} />
      </button>
    </div>
  );
}
