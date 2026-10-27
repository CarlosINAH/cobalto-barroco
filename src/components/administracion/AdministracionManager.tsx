"use client";

import { useMemo, useState } from "react";
import {
  Plus, Trash2, Save, Pencil, X, Building2,
  Banknote, Receipt, Package, PiggyBank, Landmark,
} from "lucide-react";
import type { Project, LedgerEntry, PayrollEntry } from "@/lib/db";

const mxn0 = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
const mxn2 = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 });
const money0 = (n: number | undefined) => mxn0.format(Number.isFinite(n) ? (n as number) : 0);
const money = (n: number | undefined) => mxn2.format(Number.isFinite(n) ? (n as number) : 0);

const CARD = "bg-white border border-[#EDE9E0]";
const INPUT = "w-full border border-[#EDE9E0] bg-white px-3 py-2 text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A84C]";
const LABEL = "block text-xs text-[#7A7A7A] uppercase tracking-wider mb-1";
const BTN = "flex items-center gap-2 bg-[#1B2A5E] text-[#F5F2EC] px-4 py-2.5 text-xs tracking-widest uppercase font-semibold hover:bg-[#243470] disabled:opacity-60";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
/** "2026-03" → "mar 2026"; "" → "sin fecha". */
function mesLabel(ym: string): string {
  if (!ym) return "sin fecha";
  const [y, m] = ym.split("-");
  return `${MESES[(parseInt(m, 10) || 1) - 1]} ${y}`;
}

type Tab = "obras" | "nomina" | "indirectos" | "utilidades" | "impuestos" | "adquisiciones";
const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "obras", label: "Obras", icon: Building2 },
  { id: "nomina", label: "Nómina", icon: Banknote },
  { id: "indirectos", label: "Indirectos", icon: Receipt },
  { id: "utilidades", label: "Utilidades", icon: PiggyBank },
  { id: "impuestos", label: "Impuestos", icon: Landmark },
  { id: "adquisiciones", label: "Adquisiciones", icon: Package },
];

export default function AdministracionManager({
  projects, ledger, payroll,
}: {
  projects: Project[];
  ledger: LedgerEntry[];
  payroll: PayrollEntry[];
}) {
  const [tab, setTab] = useState<Tab>("obras");
  // Solo movimientos de empresa (sin obra) viven en estas pestañas.
  const ledgerEmpresa = useMemo(() => ledger.filter((e) => e.projectId === null), [ledger]);
  const payrollEmpresa = useMemo(() => payroll.filter((e) => e.projectId === null), [payroll]);

  return (
    <div>
      <div className="flex gap-1 border-b border-[#EDE9E0] mb-6 overflow-x-auto">
        {TABS.map((t) => {
          const Icon = t.icon;
          const on = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs tracking-wider uppercase font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors ${on ? "border-[#C9A84C] text-[#1B2A5E]" : "border-transparent text-[#7A7A7A] hover:text-[#1B2A5E]"}`}>
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "obras" && <ObrasTab initial={projects} ledger={ledgerEmpresa} payroll={payrollEmpresa} />}
      {tab === "nomina" && <NominaTab inicial={payrollEmpresa} />}
      {tab === "indirectos" && <GastoTab categoria="indirectos" inicial={ledgerEmpresa.filter((e) => e.categoria === "indirectos")} />}
      {tab === "utilidades" && <GastoTab categoria="utilidades" inicial={ledgerEmpresa.filter((e) => e.categoria === "utilidades")} />}
      {tab === "impuestos" && <GastoTab categoria="impuestos" inicial={ledgerEmpresa.filter((e) => e.categoria === "impuestos")} />}
      {tab === "adquisiciones" && <GastoTab categoria="adquisiciones" inicial={ledgerEmpresa.filter((e) => e.categoria === "adquisiciones")} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OBRAS: lista de obras con sus montos + resumen de egresos de empresa por rubro.
// ─────────────────────────────────────────────────────────────────────────────
const ESTADOS = ["activo", "finalizado", "futuro"] as const;
const ESTADO_CLS: Record<string, string> = {
  activo: "bg-green-50 text-green-700 border-green-200",
  finalizado: "bg-[#F5F2EC] text-[#7A7A7A] border-[#EDE9E0]",
  futuro: "bg-[#1B2A5E]/5 text-[#1B2A5E] border-[#1B2A5E]/20",
};
type ObraForm = {
  id: string | null; cliente: string; tipo: string; ubicacion: string;
  estado: Project["estado"]; inicio: string;
  montoTotal: string; anticipo: string; egresos: string; utilidad: string;
};
const OBRA_EMPTY: ObraForm = { id: null, cliente: "", tipo: "", ubicacion: "", estado: "activo", inicio: "", montoTotal: "", anticipo: "", egresos: "", utilidad: "" };

function ObrasTab({ initial, ledger, payroll }: { initial: Project[]; ledger: LedgerEntry[]; payroll: PayrollEntry[] }) {
  const [items, setItems] = useState<Project[]>(initial);
  const [form, setForm] = useState<ObraForm>(OBRA_EMPTY);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const sum = (k: keyof Project) => items.reduce((a, p) => a + (Number(p[k]) || 0), 0);
  const totalC = sum("montoTotal"), antic = sum("anticipo"), egr = sum("egresos"), util = sum("utilidad");

  // Egresos de empresa por rubro (replica el bloque EGRESO de la hoja OBRAS).
  const rubros = useMemo(() => {
    const r: Record<string, number> = { nómina: 0, indirectos: 0, impuestos: 0, adquisiciones: 0, utilidades: 0 };
    for (const e of ledger) if (e.categoria in r) r[e.categoria] += e.monto;
    r["nómina"] += payroll.reduce((a, e) => a + e.monto, 0);
    return r;
  }, [ledger, payroll]);
  const totalEgresos = Object.values(rubros).reduce((a, b) => a + b, 0);

  function nuevo() { setForm(OBRA_EMPTY); setError(""); setOpen(true); }
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
    const cliente = form.cliente.trim(), tipo = form.tipo.trim();
    if (!cliente && !tipo) { setError("Pon al menos cliente o tipo de obra."); return; }
    setBusy(true); setError("");
    const payload = {
      nombre: [cliente, tipo].filter(Boolean).join(" — ") || "Obra",
      cliente, tipo, ubicacion: form.ubicacion.trim(), estado: form.estado, inicio: form.inicio,
      montoTotal: form.montoTotal, anticipo: form.anticipo, egresos: form.egresos, utilidad: form.utilidad,
    };
    const res = await fetch(form.id ? `/api/projects/${form.id}` : "/api/projects", {
      method: form.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
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
        <Stat label="Contratado" val={money0(totalC)} />
        <Stat label="Anticipos" val={money0(antic)} />
        <Stat label="Egresos (obras)" val={money0(egr)} />
        <Stat label="Utilidad (obras)" val={money0(util)} />
      </div>

      <div className={`${CARD} p-4 mb-5`}>
        <p className="text-[#7A7A7A] text-xs uppercase tracking-wider mb-3">Egresos de empresa por rubro</p>
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {Object.entries(rubros).map(([k, v]) => (
            <div key={k} className="border border-[#EDE9E0] px-3 py-2">
              <p className="text-[#1B2A5E] text-sm data-label">{money0(v)}</p>
              <p className="text-[#7A7A7A] text-[11px] uppercase tracking-wider capitalize">{k}</p>
            </div>
          ))}
          <div className="border border-[#1B2A5E]/20 bg-[#1B2A5E]/5 px-3 py-2">
            <p className="text-[#1B2A5E] text-sm data-label font-semibold">{money0(totalEgresos)}</p>
            <p className="text-[#7A7A7A] text-[11px] uppercase tracking-wider">Total</p>
          </div>
        </div>
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
                <td className="px-3 py-2 text-right data-label">{money0(p.montoTotal)}</td>
                <td className="px-3 py-2 text-right data-label text-[#7A7A7A]">{money0(p.anticipo)}</td>
                <td className="px-3 py-2 text-right data-label text-[#7A7A7A]">{money0(p.egresos)}</td>
                <td className="px-3 py-2 text-right data-label text-[#1B2A5E] font-medium">{money0(p.utilidad)}</td>
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

// ─────────────────────────────────────────────────────────────────────────────
// GASTOS: pestaña genérica para indirectos/utilidades/impuestos/adquisiciones.
// Egresos de empresa (categoria fija), agrupados por subcategoría, con filtro
// por mes y total. Editable.
// ─────────────────────────────────────────────────────────────────────────────
type GForm = { id: string | null; fecha: string; subcategoria: string; concepto: string; monto: string };
const G_EMPTY = (): GForm => ({ id: null, fecha: new Date().toISOString().slice(0, 10), subcategoria: "", concepto: "", monto: "" });

function GastoTab({ categoria, inicial }: { categoria: string; inicial: LedgerEntry[] }) {
  const [items, setItems] = useState<LedgerEntry[]>(inicial);
  const [mes, setMes] = useState("");
  const [sub, setSub] = useState("");
  const [form, setForm] = useState<GForm>(G_EMPTY());
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const meses = useMemo(
    () => [...new Set(items.map((e) => (e.fecha || "").slice(0, 7)))].sort().reverse(),
    [items],
  );
  const subcats = useMemo(
    () => [...new Set(items.map((e) => e.subcategoria || "").filter(Boolean))].sort(),
    [items],
  );
  const visibles = useMemo(
    () => items.filter((e) =>
      (!mes || (e.fecha || "").slice(0, 7) === mes) &&
      (!sub || (e.subcategoria || "SIN CATEGORÍA") === sub),
    ),
    [items, mes, sub],
  );
  // Agrupado por subcategoría.
  const grupos = useMemo(() => {
    const g = new Map<string, LedgerEntry[]>();
    for (const e of visibles) {
      const k = e.subcategoria || "SIN CATEGORÍA";
      (g.get(k) || g.set(k, []).get(k)!).push(e);
    }
    return [...g.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [visibles]);
  const total = visibles.reduce((a, e) => a + e.monto, 0);

  function nuevo() { const f = G_EMPTY(); f.subcategoria = subcats[0] || ""; setForm(f); setOpen(true); }
  function editar(e: LedgerEntry) {
    setForm({ id: e.id, fecha: e.fecha || "", subcategoria: e.subcategoria || "", concepto: e.concepto, monto: String(e.monto) });
    setOpen(true);
  }
  async function guardar() {
    setBusy(true);
    const payload = {
      categoria, tipo: "egreso",
      fecha: form.fecha, subcategoria: form.subcategoria.trim(),
      concepto: form.concepto.trim(), monto: Number(form.monto) || 0,
    };
    const res = await fetch(form.id ? `/api/costos/ledger/${form.id}` : "/api/costos/ledger", {
      method: form.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    setBusy(false);
    if (!res.ok) return;
    const { entry } = await res.json();
    setItems((xs) => (form.id ? xs.map((x) => (x.id === entry.id ? entry : x)) : [entry, ...xs]));
    setOpen(false);
  }
  async function borrar(id: string) {
    if (!confirm("¿Eliminar este movimiento?")) return;
    if ((await fetch(`/api/costos/ledger/${id}`, { method: "DELETE" })).ok)
      setItems((xs) => xs.filter((x) => x.id !== id));
  }

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <select value={mes} onChange={(e) => setMes(e.target.value)} className={INPUT + " w-40"}>
            <option value="">Todos los meses</option>
            {meses.map((m) => <option key={m} value={m}>{mesLabel(m)}</option>)}
          </select>
          {subcats.length > 0 && (
            <select value={sub} onChange={(e) => setSub(e.target.value)} className={INPUT + " w-44"}>
              <option value="">Todas las categorías</option>
              {subcats.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          <span className="text-sm text-[#7A7A7A]">{visibles.length} movimientos</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[#1B2A5E] text-lg data-label" style={{ fontFamily: "var(--font-playfair)" }}>{money(total)}</p>
            <p className="text-[#7A7A7A] text-[11px] uppercase tracking-wider">{mes ? mesLabel(mes) : "total"}</p>
          </div>
          <button onClick={nuevo} className={BTN}><Plus size={14} /> Agregar</button>
        </div>
      </div>

      {open && (
        <div className={`${CARD} p-5 mb-4`}>
          <div className="grid gap-3 sm:grid-cols-4">
            <div><label className={LABEL}>Fecha</label><input type="date" className={INPUT} value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} /></div>
            <div><label className={LABEL}>Subcategoría</label><input className={INPUT} list={`sub-${categoria}`} value={form.subcategoria} onChange={(e) => setForm({ ...form, subcategoria: e.target.value })} />
              <datalist id={`sub-${categoria}`}>{subcats.map((s) => <option key={s} value={s} />)}</datalist>
            </div>
            <div><label className={LABEL}>Concepto</label><input className={INPUT} value={form.concepto} onChange={(e) => setForm({ ...form, concepto: e.target.value })} /></div>
            <div><label className={LABEL}>Monto</label><input type="number" step="0.01" className={INPUT} value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} /></div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={guardar} disabled={busy} className={BTN}><Save size={14} /> Guardar</button>
            <button onClick={() => setOpen(false)} className="px-4 py-2.5 text-xs tracking-widest uppercase text-[#7A7A7A] hover:text-[#1B2A5E]">Cancelar</button>
          </div>
        </div>
      )}

      {grupos.length === 0 ? (
        <div className={`${CARD} py-12 text-center text-sm text-[#7A7A7A]`}>Sin movimientos{mes ? " en este mes" : ""}.</div>
      ) : grupos.map(([sub, entries]) => {
        const subtotal = entries.reduce((a, e) => a + e.monto, 0);
        return (
          <div key={sub} className={`${CARD} mb-4 overflow-x-auto`}>
            <div className="flex justify-between items-center px-3 py-2 border-b border-[#EDE9E0] bg-[#F5F2EC]/40">
              <span className="text-xs uppercase tracking-wider text-[#1B2A5E] font-semibold">{sub}</span>
              <span className="text-sm data-label text-[#1B2A5E]">{money(subtotal)}</span>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-[#F5F2EC] hover:bg-[#F5F2EC]/40">
                    <td className="px-3 py-2 text-[#7A7A7A] whitespace-nowrap w-28">{e.fecha || "—"}</td>
                    <td className="px-3 py-2 text-[#2C2C2C]">{e.concepto || "—"}</td>
                    <td className="px-3 py-2 text-right data-label whitespace-nowrap">{money(e.monto)}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap w-20">
                      <button onClick={() => editar(e)} className="text-[#7A7A7A] hover:text-[#1B2A5E] mr-2"><Pencil size={14} /></button>
                      <button onClick={() => borrar(e.id)} className="text-[#7A7A7A] hover:text-red-500"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NÓMINA de empresa: pagos agrupados por categoría (nómina/aguinaldo/…), filtro
// por mes y total. Editable.
// ─────────────────────────────────────────────────────────────────────────────
type NForm = { id: string | null; fecha: string; categoria: string; persona: string; monto: string };
const N_EMPTY = (): NForm => ({ id: null, fecha: new Date().toISOString().slice(0, 10), categoria: "nómina", persona: "", monto: "" });

function NominaTab({ inicial }: { inicial: PayrollEntry[] }) {
  const [items, setItems] = useState<PayrollEntry[]>(inicial);
  const [mes, setMes] = useState("");
  const [cat, setCat] = useState("");
  const [form, setForm] = useState<NForm>(N_EMPTY());
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const fechaDe = (e: PayrollEntry) => (e.fecha || "").slice(0, 7);
  const meses = useMemo(() => [...new Set(items.map(fechaDe).filter(Boolean))].sort().reverse(), [items]);
  const cats = useMemo(() => [...new Set(items.map((e) => e.categoria || "").filter(Boolean))].sort(), [items]);
  const visibles = useMemo(
    () => items.filter((e) => (!mes || fechaDe(e) === mes) && (!cat || (e.categoria || "nómina") === cat)),
    [items, mes, cat],
  );
  const grupos = useMemo(() => {
    const g = new Map<string, PayrollEntry[]>();
    for (const e of visibles) {
      const k = e.categoria || "nómina";
      (g.get(k) || g.set(k, []).get(k)!).push(e);
    }
    return [...g.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [visibles]);
  const total = visibles.reduce((a, e) => a + e.monto, 0);

  function nuevo() { const f = N_EMPTY(); f.categoria = cats[0] || "nómina"; setForm(f); setOpen(true); }
  function editar(e: PayrollEntry) {
    setForm({ id: e.id, fecha: e.fecha || "", categoria: e.categoria || "nómina", persona: e.persona, monto: String(e.monto) });
    setOpen(true);
  }
  async function guardar() {
    const persona = form.persona.trim();
    if (!persona) return;
    setBusy(true);
    const payload = { persona, categoria: form.categoria.trim(), fecha: form.fecha, periodo: form.fecha, monto: Number(form.monto) || 0, pagado: true };
    const res = await fetch(form.id ? `/api/costos/payroll/${form.id}` : "/api/costos/payroll", {
      method: form.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    setBusy(false);
    if (!res.ok) return;
    const { entry } = await res.json();
    setItems((xs) => (form.id ? xs.map((x) => (x.id === entry.id ? entry : x)) : [entry, ...xs]));
    setOpen(false);
  }
  async function borrar(id: string) {
    if (!confirm("¿Eliminar este pago?")) return;
    if ((await fetch(`/api/costos/payroll/${id}`, { method: "DELETE" })).ok)
      setItems((xs) => xs.filter((x) => x.id !== id));
  }

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <select value={mes} onChange={(e) => setMes(e.target.value)} className={INPUT + " w-40"}>
            <option value="">Todos los meses</option>
            {meses.map((m) => <option key={m} value={m}>{mesLabel(m)}</option>)}
          </select>
          <select value={cat} onChange={(e) => setCat(e.target.value)} className={INPUT + " w-44 capitalize"}>
            <option value="">Todas las categorías</option>
            {cats.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <span className="text-sm text-[#7A7A7A]">{visibles.length} pagos</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[#1B2A5E] text-lg data-label" style={{ fontFamily: "var(--font-playfair)" }}>{money(total)}</p>
            <p className="text-[#7A7A7A] text-[11px] uppercase tracking-wider">{mes ? mesLabel(mes) : "total"}</p>
          </div>
          <button onClick={nuevo} className={BTN}><Plus size={14} /> Agregar</button>
        </div>
      </div>

      {open && (
        <div className={`${CARD} p-5 mb-4`}>
          <div className="grid gap-3 sm:grid-cols-4">
            <div><label className={LABEL}>Fecha</label><input type="date" className={INPUT} value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} /></div>
            <div><label className={LABEL}>Categoría</label><input className={INPUT} list="nom-cats" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} />
              <datalist id="nom-cats">{cats.map((s) => <option key={s} value={s} />)}</datalist>
            </div>
            <div><label className={LABEL}>Persona</label><input className={INPUT} value={form.persona} onChange={(e) => setForm({ ...form, persona: e.target.value })} /></div>
            <div><label className={LABEL}>Monto</label><input type="number" step="0.01" className={INPUT} value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} /></div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={guardar} disabled={busy} className={BTN}><Save size={14} /> Guardar</button>
            <button onClick={() => setOpen(false)} className="px-4 py-2.5 text-xs tracking-widest uppercase text-[#7A7A7A] hover:text-[#1B2A5E]">Cancelar</button>
          </div>
        </div>
      )}

      {grupos.length === 0 ? (
        <div className={`${CARD} py-12 text-center text-sm text-[#7A7A7A]`}>Sin pagos{mes ? " en este mes" : ""}.</div>
      ) : grupos.map(([cat, entries]) => {
        const subtotal = entries.reduce((a, e) => a + e.monto, 0);
        return (
          <div key={cat} className={`${CARD} mb-4 overflow-x-auto`}>
            <div className="flex justify-between items-center px-3 py-2 border-b border-[#EDE9E0] bg-[#F5F2EC]/40">
              <span className="text-xs uppercase tracking-wider text-[#1B2A5E] font-semibold capitalize">{cat}</span>
              <span className="text-sm data-label text-[#1B2A5E]">{money(subtotal)}</span>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-[#F5F2EC] hover:bg-[#F5F2EC]/40">
                    <td className="px-3 py-2 text-[#7A7A7A] whitespace-nowrap w-28">{e.fecha || e.periodo || "—"}</td>
                    <td className="px-3 py-2 text-[#2C2C2C]">{e.persona}{e.rol ? <span className="text-[#7A7A7A]"> · {e.rol}</span> : null}</td>
                    <td className="px-3 py-2 text-right data-label whitespace-nowrap">{money(e.monto)}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap w-20">
                      <button onClick={() => editar(e)} className="text-[#7A7A7A] hover:text-[#1B2A5E] mr-2"><Pencil size={14} /></button>
                      <button onClick={() => borrar(e.id)} className="text-[#7A7A7A] hover:text-red-500"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
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
