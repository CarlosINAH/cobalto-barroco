"use client";

import { useMemo, useState } from "react";
import {
  Plus, Trash2, Save, FileText, Download, Send, Check, Ban,
  ClipboardList, Layers, ArrowLeft, Search, ShoppingCart, Package, FlaskConical, Coins,
  Lock, ClipboardCheck, Scale,
} from "lucide-react";
import type {
  Budget, BudgetLine, BudgetEstado, Project,
  CostMaterial, Recipe, LaborRate, ProrrateoItem,
} from "@/lib/db";
import { fichaCompleta, type BudgetFicha } from "@/lib/budget-ficha";
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
  materialIntervencion?: string;
  cuadrillaPersonas?: number;
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
  const [ficha, setFicha] = useState<BudgetFicha>(
    budget.ficha || { bien: budget.obra || "" },
  );
  const [busy, setBusy] = useState(false);
  const [guardado, setGuardado] = useState(true);
  const [catTab, setCatTab] = useState<CatTab>("conceptos");
  const [q, setQ] = useState("");
  const [cmat, setCmat] = useState(""); // filtro de conceptos por material a intervenir
  const [prorrateos, setProrrateos] = useState<ProrrateoItem[]>(budget.prorrateos ?? []);

  const completa = fichaCompleta(ficha);
  const setF = (k: keyof BudgetFicha, v: string) => {
    setFicha((f) => ({ ...f, [k]: v }));
    setGuardado(false);
  };

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
      body: JSON.stringify({
        lineas,
        ficha,
        prorrateos,
        // Mantiene coherentes los campos que ya usan tabla y PDF.
        obra: (ficha.bien || "").trim(),
        cliente: (ficha.institucion || ficha.contacto || "").trim(),
      }),
    });
    setBusy(false);
    if (!res.ok) return;
    const { budget: nb } = await res.json();
    onChange(nb); setGuardado(true);
  }

  // ── Catálogo filtrado por búsqueda ──
  const nq = q.trim().toLowerCase();
  const matsInterv = useMemo(
    () => [...new Set(conceptos.map((c) => c.materialIntervencion).filter(Boolean))].sort() as string[],
    [conceptos],
  );
  const fConceptos = useMemo(
    () => conceptos.filter((c) =>
      (!cmat || c.materialIntervencion === cmat) &&
      (!nq || `${c.clave} ${c.concepto} ${c.descripcion} ${c.materialIntervencion || ""}`.toLowerCase().includes(nq)),
    ),
    [conceptos, nq, cmat],
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

  const addConcepto = (c: ConceptoPick) => addLine({ conceptId: c.id, clave: c.clave, concepto: c.concepto, descripcion: c.descripcion, unidad: c.unidad, pu: c.pu, cantidad: 1, tiempoPU: c.tiempoPU ?? null, cuadrillaPersonas: c.cuadrillaPersonas });
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

      {/* Ficha de registro (primera hoja) — obligatoria antes de capturar precios */}
      <div className={`${CARD} p-5 mb-4`}>
        <div className="flex items-center gap-2 mb-1">
          <ClipboardCheck size={16} className={completa ? "text-green-600" : "text-[#C9A84C]"} />
          <h3 className="text-sm uppercase tracking-wider text-[#1B2A5E] font-semibold">Ficha de registro</h3>
          {completa
            ? <span className="text-[11px] text-green-700 flex items-center gap-1"><Check size={12} /> Completa</span>
            : <span className="text-[11px] text-[#C9A84C]">Obligatoria para capturar precios</span>}
        </div>
        <p className="text-xs text-[#7A7A7A] mb-4">Datos del bien a intervenir. Los campos con <span className="text-[#C9A84C]">*</span> son obligatorios.</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div><label className={LABEL}>Nombre del bien *</label><input className={INPUT} value={ficha.bien || ""} onChange={(e) => setF("bien", e.target.value)} placeholder="p. ej. Retablo mayor" /></div>
          <div><label className={LABEL}>Tipo de bien *</label><input className={INPUT} value={ficha.tipoBien || ""} onChange={(e) => setF("tipoBien", e.target.value)} placeholder="escultura, caballete, mural…" /></div>
          <div><label className={LABEL}>Material *</label><input className={INPUT} value={ficha.material || ""} onChange={(e) => setF("material", e.target.value)} placeholder="metal, madera, piedra…" /></div>
          <div><label className={LABEL}>Recinto / inmueble</label><input className={INPUT} value={ficha.recinto || ""} onChange={(e) => setF("recinto", e.target.value)} placeholder="Templo de San Francisco" /></div>
          <div><label className={LABEL}>Ciudad *</label><input className={INPUT} value={ficha.ciudad || ""} onChange={(e) => setF("ciudad", e.target.value)} /></div>
          <div><label className={LABEL}>Estado *</label><input className={INPUT} value={ficha.entidad || ""} onChange={(e) => setF("entidad", e.target.value)} placeholder="Entidad federativa" /></div>
          <div><label className={LABEL}>Contacto *</label><input className={INPUT} value={ficha.contacto || ""} onChange={(e) => setF("contacto", e.target.value)} placeholder="Nombre del contacto" /></div>
          <div><label className={LABEL}>Institución / empresa *</label><input className={INPUT} value={ficha.institucion || ""} onChange={(e) => setF("institucion", e.target.value)} placeholder="En caso de trabajo en conjunto" /></div>
        </div>
        <div className="mt-3">
          <label className={LABEL}>Breve descripción del proyecto</label>
          <textarea className={INPUT + " resize-y"} rows={2} value={ficha.descripcion || ""} onChange={(e) => setF("descripcion", e.target.value)} placeholder="Aparece en el PDF de la cotización." />
        </div>
        <p className="text-[11px] text-[#7A7A7A] mt-2">* Contacto o institución: basta uno.</p>
      </div>

      {!completa ? (
        <div className={`${CARD} p-10 text-center`}>
          <Lock size={22} className="mx-auto mb-3 text-[#C9A84C]" />
          <p className="text-[#1B2A5E] font-semibold mb-1">Completa la ficha de registro</p>
          <p className="text-sm text-[#7A7A7A]">No se pueden capturar precios hasta llenar los datos obligatorios del bien. Recuerda <span className="font-medium text-[#2C2C2C]">guardar</span> los cambios.</p>
        </div>
      ) : (
      <>
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
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A7A7A]" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className={INPUT + " pl-9 w-full"} />
            </div>
            {catTab === "conceptos" && matsInterv.length > 0 && (
              <select value={cmat} onChange={(e) => setCmat(e.target.value)} className={INPUT + " w-48"} title="Filtrar por material a intervenir">
                <option value="">Todos los materiales</option>
                {matsInterv.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            )}
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

      {lineas.length > 0 && (
        <Prorrateo
          lineas={lineas}
          prorrateos={prorrateos}
          onChange={(p) => { setProrrateos(p); setGuardado(false); }}
        />
      )}
      </>
      )}
    </div>
  );
}

/** Reparte montos (viáticos, comisión, un material/equipo no aceptado) entre
 *  los conceptos elegidos, en el porcentaje deseado, absorbiéndolos en su P.U. */
function Prorrateo({ lineas, prorrateos, onChange }: {
  lineas: BudgetLine[]; prorrateos: ProrrateoItem[];
  onChange: (p: ProrrateoItem[]) => void;
}) {
  const [open, setOpen] = useState(prorrateos.length > 0);

  // Asignado a cada línea por todos los prorrateos (monto × %).
  const asignadoDe = (lk: string) =>
    prorrateos.reduce((a, p) => a + p.reparto.reduce((b, r) => b + (r.lineKey === lk ? p.monto * (r.porcentaje / 100) : 0), 0), 0);
  const subtotalOrig = lineas.reduce((a, l) => a + l.pu * l.cantidad, 0);
  const totalProrrateado = prorrateos.reduce((a, p) => a + p.monto, 0);

  const upd = (id: string, patch: Partial<ProrrateoItem>) =>
    onChange(prorrateos.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const addItem = () =>
    onChange([...prorrateos, { id: `PRO-${Date.now()}`, nombre: "", monto: 0, reparto: [] }]);
  const delItem = (id: string) => onChange(prorrateos.filter((p) => p.id !== id));

  const toggleLinea = (p: ProrrateoItem, lk: string) => {
    const has = p.reparto.some((r) => r.lineKey === lk);
    const reparto = has ? p.reparto.filter((r) => r.lineKey !== lk) : [...p.reparto, { lineKey: lk, porcentaje: 0 }];
    upd(p.id, { reparto });
  };
  const setPct = (p: ProrrateoItem, lk: string, v: number) =>
    upd(p.id, { reparto: p.reparto.map((r) => (r.lineKey === lk ? { ...r, porcentaje: v } : r)) });
  const repartirIgual = (p: ProrrateoItem) => {
    if (p.reparto.length === 0) return;
    const pct = Math.round((100 / p.reparto.length) * 100) / 100;
    upd(p.id, { reparto: p.reparto.map((r) => ({ ...r, porcentaje: pct })) });
  };

  return (
    <div className={`${CARD} p-5 mt-4`}>
      <button onClick={() => setOpen((v) => !v)} className="flex items-center justify-between w-full">
        <span className="flex items-center gap-2 text-xs uppercase tracking-wider text-[#1B2A5E] font-semibold">
          <Scale size={15} className="text-[#C9A84C]" /> Prorrateo {prorrateos.length > 0 && <span className="text-[#7A7A7A]">({prorrateos.length})</span>}
        </span>
        <span className="text-xs text-[#7A7A7A]">{open ? "ocultar" : "mostrar"}</span>
      </button>

      {open && (
        <div className="mt-4 space-y-5">
          <p className="text-xs text-[#7A7A7A]">Reparte un monto (viáticos, comisión, un material/equipo que no te aceptan comprar directo) entre los conceptos elegidos, en el % que quieras. El total del presupuesto sube en ese monto; cada P.U. lo absorbe.</p>

          {prorrateos.map((p) => {
            const sumPct = p.reparto.reduce((a, r) => a + r.porcentaje, 0);
            return (
            <div key={p.id} className="border border-[#EDE9E0] p-4">
              <div className="flex flex-wrap items-end gap-3 mb-3">
                <div className="flex-1 min-w-[160px]"><label className={LABEL}>Concepto a repartir</label>
                  <input className={INPUT} value={p.nombre} onChange={(e) => upd(p.id, { nombre: e.target.value })} placeholder="Viáticos, comisión…" /></div>
                <div className="w-40"><label className={LABEL}>Monto (MXN)</label>
                  <input type="number" step="0.01" className={INPUT} value={p.monto || ""} onChange={(e) => upd(p.id, { monto: Number(e.target.value) || 0 })} /></div>
                <button onClick={() => repartirIgual(p)} className="px-3 py-2 text-xs tracking-wider uppercase border border-[#EDE9E0] text-[#1B2A5E] hover:border-[#C9A84C]">Repartir igual</button>
                <button onClick={() => delItem(p.id)} className="text-[#7A7A7A] hover:text-red-500 p-2"><Trash2 size={15} /></button>
              </div>
              <div className="border border-[#EDE9E0]">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F5F2EC] text-[11px] uppercase tracking-wider text-[#7A7A7A]">
                  <span className="w-5" /><span className="flex-1">Concepto</span><span className="w-16 text-right">%</span><span className="w-24 text-right">Asignado</span>
                </div>
                <div className="max-h-56 overflow-y-auto divide-y divide-[#F5F2EC]">
                  {lineas.map((l) => {
                    const lk = lineKey(l);
                    const r = p.reparto.find((x) => x.lineKey === lk);
                    const on = !!r;
                    return (
                      <div key={lk} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                        <input type="checkbox" checked={on} onChange={() => toggleLinea(p, lk)} className="w-5" />
                        <span className="flex-1 truncate text-[#2C2C2C]" title={l.concepto}>{l.clave ? l.clave + " · " : ""}{l.concepto}</span>
                        <input type="number" step="0.01" disabled={!on} value={on ? (r!.porcentaje || "") : ""} onChange={(e) => setPct(p, lk, Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                          className="w-16 border border-[#EDE9E0] px-2 py-1 text-right disabled:bg-[#F5F2EC]" />
                        <span className="w-24 text-right data-label text-[#7A7A7A]">{on ? money(p.monto * (r!.porcentaje / 100)) : "—"}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <p className={`text-[11px] mt-1 ${Math.abs(sumPct - 100) < 0.01 ? "text-emerald-600" : "text-[#C9A84C]"}`}>Suma de porcentajes: {sumPct.toFixed(2)}%{Math.abs(sumPct - 100) >= 0.01 ? " (debería ser 100%)" : ""}</p>
            </div>
            );
          })}

          <button onClick={addItem} className={BTN_GHOST}><Plus size={14} /> Agregar monto a prorratear</button>

          {/* Resultado: P.U. original → prorrateado por concepto */}
          {totalProrrateado > 0 && (
            <div className="border border-[#EDE9E0] overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[#7A7A7A] text-xs uppercase tracking-wider border-b border-[#EDE9E0]">
                    <th className="px-3 py-2 font-semibold">Concepto</th>
                    <th className="px-3 py-2 font-semibold text-right">Cant.</th>
                    <th className="px-3 py-2 font-semibold text-right">P.U. original</th>
                    <th className="px-3 py-2 font-semibold text-right">Asignado</th>
                    <th className="px-3 py-2 font-semibold text-right">P.U. prorrateado</th>
                    <th className="px-3 py-2 font-semibold text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {lineas.map((l) => {
                    const lk = lineKey(l);
                    const asig = asignadoDe(lk);
                    const puPro = l.cantidad > 0 ? l.pu + asig / l.cantidad : l.pu;
                    return (
                      <tr key={lk} className="border-b border-[#F5F2EC]">
                        <td className="px-3 py-2 text-[#2C2C2C] truncate max-w-[220px]" title={l.concepto}>{l.concepto}</td>
                        <td className="px-3 py-2 text-right data-label text-[#7A7A7A]">{l.cantidad}</td>
                        <td className="px-3 py-2 text-right data-label text-[#7A7A7A]">{money(l.pu)}</td>
                        <td className="px-3 py-2 text-right data-label">{asig > 0 ? money(asig) : "—"}</td>
                        <td className="px-3 py-2 text-right data-label text-[#1B2A5E] font-medium">{money(puPro)}</td>
                        <td className="px-3 py-2 text-right data-label">{money(puPro * l.cantidad)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-[#EDE9E0] text-[#1B2A5E] font-semibold">
                    <td className="px-3 py-2" colSpan={3}>Total (original {money(subtotalOrig)} + prorrateado {money(totalProrrateado)})</td>
                    <td className="px-3 py-2 text-right data-label">{money(totalProrrateado)}</td>
                    <td className="px-3 py-2" />
                    <td className="px-3 py-2 text-right data-label">{money(subtotalOrig + totalProrrateado)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
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
