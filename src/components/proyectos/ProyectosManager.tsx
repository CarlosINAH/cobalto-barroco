"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Calculator,
  FileText,
  CalendarRange,
  Wallet,
  Users,
  ChevronLeft,
  MapPin,
  ArrowRight,
  Plus,
  Trash2,
  Save,
  Printer,
  Download,
} from "lucide-react";
import type {
  Project,
  Budget,
  BudgetLine,
  LedgerEntry,
  PayrollEntry,
} from "@/lib/db";
import { budgetTotals } from "@/lib/pu";

/** Concepto de la biblioteca, con su P.U. ya calculado. */
export interface ConceptoLite {
  id: string;
  clave: string;
  concepto: string;
  descripcion: string;
  unidad: string;
  pu: number;
  tiempoPU: number | null;
}

const mxn = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
const money = (n: number) => mxn.format(Number.isFinite(n) ? n : 0);
const pct = (n: number) => `${(n * 100).toFixed(0)}%`;

const CARD = "bg-white border border-[#EDE9E0]";
const BTN_PRIMARY =
  "flex items-center gap-2 bg-[#1B2A5E] text-[#F5F2EC] px-4 py-2.5 text-xs tracking-widest uppercase font-semibold hover:bg-[#243470] disabled:opacity-60";
const INPUT =
  "border border-[#EDE9E0] bg-white px-3 py-2 text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A84C]";

type SubTab = "presupuesto" | "cotizacion" | "cronograma" | "administracion" | "nomina";

const SUBTABS: { id: SubTab; label: string; icon: React.ElementType }[] = [
  { id: "presupuesto", label: "Presupuesto", icon: Calculator },
  { id: "cotizacion", label: "Cotización", icon: FileText },
  { id: "cronograma", label: "Cronograma", icon: CalendarRange },
  { id: "administracion", label: "Administración", icon: Wallet },
  { id: "nomina", label: "Nómina", icon: Users },
];

const ESTADO: Record<Project["estado"], { label: string; cls: string }> = {
  activo: { label: "Activo", cls: "bg-green-50 text-green-700 border-green-200" },
  finalizado: { label: "Finalizado", cls: "bg-[#F5F2EC] text-[#7A7A7A] border-[#EDE9E0]" },
  futuro: { label: "Futuro", cls: "bg-[#1B2A5E]/5 text-[#1B2A5E] border-[#1B2A5E]/20" },
};

export default function ProyectosManager({
  proyectos,
  budgets,
  conceptos,
  ledger,
  payroll,
}: {
  proyectos: Project[];
  budgets: Budget[];
  conceptos: ConceptoLite[];
  ledger: LedgerEntry[];
  payroll: PayrollEntry[];
}) {
  const [selId, setSelId] = useState<string | null>(null);
  const sel = proyectos.find((p) => p.id === selId) || null;

  if (sel) {
    return (
      <ProyectoDetalle
        proyecto={sel}
        budgetInicial={budgets.find((b) => b.projectId === sel.id) || null}
        conceptos={conceptos}
        ledgerInicial={ledger.filter((e) => e.projectId === sel.id)}
        payrollInicial={payroll.filter((e) => e.projectId === sel.id)}
        onBack={() => setSelId(null)}
      />
    );
  }

  return (
    <div>
      <p className="text-sm text-[#7A7A7A] mb-5">
        Elige un proyecto para analizar, cotizar o editar. Los P.U. salen de los{" "}
        <Link href="/dashboard/admin/costos" className="text-[#1B2A5E] underline hover:text-[#C9A84C]">catálogos de costos</Link>
        {" "}({conceptos.length} conceptos en biblioteca).
      </p>
      {proyectos.length === 0 ? (
        <div className={`${CARD} py-16 px-6 text-center text-sm text-[#7A7A7A]`}>
          No hay proyectos todavía. Crea uno en{" "}
          <Link href="/dashboard/admin/personal" className="text-[#1B2A5E] underline hover:text-[#C9A84C]">Personal y permisos</Link>{" "}
          y aparecerá aquí para presupuestar.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {proyectos.map((p) => {
            const est = ESTADO[p.estado] ?? ESTADO.activo;
            const tiene = budgets.some((b) => b.projectId === p.id);
            return (
              <button key={p.id} onClick={() => setSelId(p.id)} className={`${CARD} p-5 text-left hover:border-[#C9A84C]/60 transition-colors group`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs px-2 py-0.5 border ${est.cls}`}>{est.label}</span>
                  <ArrowRight size={14} className="text-[#EDE9E0] group-hover:text-[#C9A84C]" />
                </div>
                <h3 className="text-[#1B2A5E] text-lg leading-tight" style={{ fontFamily: "var(--font-playfair)" }}>{p.nombre}</h3>
                {p.ubicacion && <p className="flex items-center gap-1 text-xs text-[#7A7A7A] mt-1"><MapPin size={12} /> {p.ubicacion}</p>}
                <div className="mt-4 h-1.5 bg-[#F5F2EC] overflow-hidden">
                  <div className="h-full bg-[#C9A84C]" style={{ width: `${Math.min(100, Math.max(0, p.avance))}%` }} />
                </div>
                <p className="text-xs text-[#7A7A7A] mt-1 data-label">{p.avance}% avance{tiene ? " · con presupuesto" : ""}</p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProyectoDetalle({
  proyecto,
  budgetInicial,
  conceptos,
  ledgerInicial,
  payrollInicial,
  onBack,
}: {
  proyecto: Project;
  budgetInicial: Budget | null;
  conceptos: ConceptoLite[];
  ledgerInicial: LedgerEntry[];
  payrollInicial: PayrollEntry[];
  onBack: () => void;
}) {
  const [tab, setTab] = useState<SubTab>("presupuesto");
  const [budget, setBudget] = useState<Budget | null>(budgetInicial);
  const est = ESTADO[proyecto.estado] ?? ESTADO.activo;

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-[#7A7A7A] hover:text-[#1B2A5E] mb-4" data-no-print>
        <ChevronLeft size={16} /> Todos los proyectos
      </button>

      <div className={`${CARD} p-5 mb-5`} data-no-print>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-[#1B2A5E] text-2xl" style={{ fontFamily: "var(--font-playfair)" }}>{proyecto.nombre}</h2>
            {proyecto.ubicacion && <p className="flex items-center gap-1 text-sm text-[#7A7A7A] mt-1"><MapPin size={13} /> {proyecto.ubicacion}</p>}
          </div>
          <span className={`text-xs px-2 py-1 border ${est.cls}`}>{est.label}</span>
        </div>
      </div>

      <div className="flex gap-1 border-b border-[#EDE9E0] mb-6 overflow-x-auto" data-no-print>
        {SUBTABS.map((s) => {
          const Icon = s.icon;
          const on = tab === s.id;
          return (
            <button key={s.id} onClick={() => setTab(s.id)} className={`flex items-center gap-2 px-4 py-2.5 text-xs tracking-wider uppercase font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors ${on ? "border-[#C9A84C] text-[#1B2A5E]" : "border-transparent text-[#7A7A7A] hover:text-[#1B2A5E]"}`}>
              <Icon size={14} /> {s.label}
            </button>
          );
        })}
      </div>

      {tab === "presupuesto" && (
        <Presupuesto proyecto={proyecto} budget={budget} conceptos={conceptos} onChange={setBudget} />
      )}
      {tab === "cotizacion" && <Cotizacion proyecto={proyecto} budget={budget} />}
      {tab === "cronograma" && <Cronograma budget={budget} onChange={setBudget} />}
      {tab === "administracion" && <Administracion proyecto={proyecto} budget={budget} inicial={ledgerInicial} />}
      {tab === "nomina" && <Nomina proyecto={proyecto} inicial={payrollInicial} />}
    </div>
  );
}

// ─── Presupuesto (editor de líneas) ──────────────────────────────────────────
function Presupuesto({
  proyecto,
  budget,
  conceptos,
  onChange,
}: {
  proyecto: Project;
  budget: Budget | null;
  conceptos: ConceptoLite[];
  onChange: (b: Budget) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [pick, setPick] = useState("");
  const [cant, setCant] = useState("1");
  const [cliente, setCliente] = useState(budget?.cliente ?? "");

  async function crear() {
    setBusy(true);
    const res = await fetch("/api/costos/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: proyecto.id, nombre: `Presupuesto ${proyecto.nombre}`, cliente, lineas: [] }),
    });
    setBusy(false);
    if (res.ok) onChange((await res.json()).budget);
  }

  async function persist(next: Budget) {
    onChange(next); // optimista
    await fetch(`/api/costos/budgets/${next.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cliente: next.cliente, lineas: next.lineas }),
    });
  }

  if (!budget) {
    if (conceptos.length === 0)
      return (
        <div className={`${CARD} py-14 px-6 text-center text-sm text-[#7A7A7A]`}>
          Primero crea conceptos en{" "}
          <Link href="/dashboard/admin/costos" className="text-[#1B2A5E] underline hover:text-[#C9A84C]">Costos y P.U. → Conceptos</Link>,
          luego arma el presupuesto aquí.
        </div>
      );
    return (
      <div className={`${CARD} py-14 px-6 text-center`}>
        <p className="text-sm text-[#7A7A7A] mb-4">Este proyecto aún no tiene presupuesto.</p>
        <button onClick={crear} disabled={busy} className={BTN_PRIMARY + " mx-auto"}><Plus size={14} /> Crear presupuesto</button>
      </div>
    );
  }

  const b = budget; // ya no es null tras el guard; alias para las closures
  const totals = budgetTotals(b);

  function addLinea() {
    const c = conceptos.find((x) => x.id === pick);
    if (!c) return;
    const linea: BudgetLine = {
      conceptId: c.id, clave: c.clave, concepto: c.concepto, descripcion: c.descripcion,
      unidad: c.unidad, pu: c.pu, cantidad: Number(cant) || 0, tiempoPU: c.tiempoPU,
    };
    persist({ ...b, lineas: [...b.lineas, linea] });
    setPick(""); setCant("1");
  }
  function setCantidad(idx: number, v: number) {
    persist({ ...b, lineas: b.lineas.map((l, j) => (j === idx ? { ...l, cantidad: v } : l)) });
  }
  function quitar(idx: number) {
    persist({ ...b, lineas: b.lineas.filter((_, j) => j !== idx) });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <label className="text-xs text-[#7A7A7A] flex items-center gap-2">Cliente
          <input value={cliente} onChange={(e) => setCliente(e.target.value)} onBlur={() => persist({ ...b, cliente })} className={INPUT + " w-56"} placeholder="Nombre del cliente" />
        </label>
        <span className="text-xs text-[#7A7A7A] data-label ml-auto">Guardado automáticamente</span>
      </div>

      <div className={`${CARD} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[#7A7A7A] text-xs uppercase tracking-wider border-b border-[#EDE9E0]">
              <th className="px-3 py-3 font-semibold">Clave</th>
              <th className="px-3 py-3 font-semibold">Concepto</th>
              <th className="px-3 py-3 font-semibold">Unidad</th>
              <th className="px-3 py-3 font-semibold text-right">P.U.</th>
              <th className="px-3 py-3 font-semibold text-right">Cantidad</th>
              <th className="px-3 py-3 font-semibold text-right">Importe</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {budget.lineas.map((l, idx) => (
              <tr key={idx} className="border-b border-[#F5F2EC]">
                <td className="px-3 py-2 data-label text-[#7A7A7A]">{l.clave || "—"}</td>
                <td className="px-3 py-2 text-[#2C2C2C]">{l.concepto || l.descripcion}</td>
                <td className="px-3 py-2 text-[#7A7A7A]">{l.unidad}</td>
                <td className="px-3 py-2 text-right data-label text-[#7A7A7A]">{money(l.pu)}</td>
                <td className="px-3 py-2 text-right">
                  <input type="number" step="0.01" defaultValue={l.cantidad} onBlur={(e) => setCantidad(idx, Number(e.target.value) || 0)} className="w-20 border border-[#EDE9E0] px-2 py-1 text-right text-sm focus:outline-none focus:border-[#C9A84C] data-label" />
                </td>
                <td className="px-3 py-2 text-right data-label text-[#2C2C2C] font-medium">{money(l.pu * l.cantidad)}</td>
                <td className="px-3 py-2 text-right"><button onClick={() => quitar(idx)} className="text-[#7A7A7A] hover:text-red-500"><Trash2 size={14} /></button></td>
              </tr>
            ))}
            {budget.lineas.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-[#7A7A7A]">Agrega conceptos abajo.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Agregar línea */}
      <div className="flex flex-wrap items-end gap-2 mt-3 mb-5">
        <select value={pick} onChange={(e) => setPick(e.target.value)} className={INPUT + " flex-1 min-w-[260px]"}>
          <option value="">Elegir concepto de la biblioteca…</option>
          {conceptos.map((c) => <option key={c.id} value={c.id}>{(c.clave ? c.clave + " · " : "") + (c.concepto || c.descripcion)} · {money(c.pu)}/{c.unidad || "u"}</option>)}
        </select>
        <input type="number" step="0.01" value={cant} onChange={(e) => setCant(e.target.value)} className={INPUT + " w-24"} placeholder="Cant." />
        <button onClick={addLinea} disabled={!pick} className={BTN_PRIMARY}><Plus size={14} /> Agregar</button>
      </div>

      {/* Totales */}
      <div className="flex justify-end">
        <div className={`${CARD} p-4 w-full sm:w-80 space-y-1.5 text-sm data-label`}>
          <Row label="Subtotal" val={money(totals.subtotal)} />
          <Row label={`IVA ${pct(budget.factorIva)}`} val={money(totals.iva)} />
          <div className="border-t border-[#EDE9E0] pt-1.5">
            <Row label="Total" val={money(totals.total)} bold />
          </div>
          <Row label="Jornadas" val={totals.jornadas.toFixed(2)} muted />
        </div>
      </div>
    </div>
  );
}

function Row({ label, val, bold, muted }: { label: string; val: string; bold?: boolean; muted?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "text-[#1B2A5E] font-bold text-base" : muted ? "text-[#7A7A7A] text-xs" : "text-[#2C2C2C]"}`}>
      <span>{label}</span><span>{val}</span>
    </div>
  );
}

// ─── Cotización (vista imprimible / PDF) ─────────────────────────────────────
function Cotizacion({ proyecto, budget }: { proyecto: Project; budget: Budget | null }) {
  if (!budget || budget.lineas.length === 0)
    return <div className={`${CARD} py-14 px-6 text-center text-sm text-[#7A7A7A]`}>Arma primero el presupuesto en la pestaña Presupuesto.</div>;
  const totals = budgetTotals(budget);
  return (
    <div>
      <style>{`@media print { [data-no-print]{display:none!important} body{background:#fff} .cotiz-print{border:none!important} }`}</style>
      <div className="flex justify-end gap-2 mb-3" data-no-print>
        <a href={`/api/costos/budgets/${budget.id}/pdf`} target="_blank" rel="noopener noreferrer" className={BTN_PRIMARY}><Download size={14} /> Descargar PDF</a>
        <button onClick={() => window.print()} className="flex items-center gap-2 border border-[#EDE9E0] text-[#1B2A5E] px-4 py-2.5 text-xs tracking-widest uppercase font-semibold hover:bg-[#F5F2EC]"><Printer size={14} /> Imprimir</button>
      </div>
      <div className={`${CARD} p-8 cotiz-print`}>
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-[#1B2A5E] text-2xl" style={{ fontFamily: "var(--font-playfair)" }}>Cobalto Barroco</h2>
            <p className="text-xs text-[#7A7A7A] uppercase tracking-widest">Propuesta técnica y económica</p>
          </div>
          <div className="text-right text-xs text-[#7A7A7A]">
            <p>Proyecto: <span className="text-[#2C2C2C]">{proyecto.nombre}</span></p>
            {budget.cliente && <p>Cliente: <span className="text-[#2C2C2C]">{budget.cliente}</span></p>}
            <p className="data-label">{new Date().toLocaleDateString("es-MX")}</p>
          </div>
        </div>
        <table className="w-full text-sm mb-5">
          <thead>
            <tr className="text-left text-[#7A7A7A] text-xs uppercase tracking-wider border-b-2 border-[#1B2A5E]">
              <th className="py-2 font-semibold">Clave</th>
              <th className="py-2 font-semibold">Concepto</th>
              <th className="py-2 font-semibold text-right">Unidad</th>
              <th className="py-2 font-semibold text-right">Cant.</th>
              <th className="py-2 font-semibold text-right">P.U.</th>
              <th className="py-2 font-semibold text-right">Importe</th>
            </tr>
          </thead>
          <tbody>
            {budget.lineas.map((l, i) => (
              <tr key={i} className="border-b border-[#EDE9E0]">
                <td className="py-2 data-label text-[#7A7A7A]">{l.clave || "—"}</td>
                <td className="py-2 text-[#2C2C2C]">{l.concepto || l.descripcion}</td>
                <td className="py-2 text-right text-[#7A7A7A]">{l.unidad}</td>
                <td className="py-2 text-right data-label">{l.cantidad}</td>
                <td className="py-2 text-right data-label text-[#7A7A7A]">{money(l.pu)}</td>
                <td className="py-2 text-right data-label text-[#2C2C2C]">{money(l.pu * l.cantidad)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="data-label">
            <tr><td colSpan={5} className="py-1.5 text-right text-[#7A7A7A]">Subtotal</td><td className="py-1.5 text-right text-[#2C2C2C]">{money(totals.subtotal)}</td></tr>
            <tr><td colSpan={5} className="py-1.5 text-right text-[#7A7A7A]">IVA {pct(budget.factorIva)}</td><td className="py-1.5 text-right text-[#2C2C2C]">{money(totals.iva)}</td></tr>
            <tr className="border-t-2 border-[#1B2A5E]"><td colSpan={5} className="py-2 text-right text-[#1B2A5E] font-bold">Total</td><td className="py-2 text-right text-[#1B2A5E] font-bold">{money(totals.total)}</td></tr>
          </tfoot>
        </table>
        <p className="text-xs text-[#7A7A7A]">El presupuesto tiene una vigencia de 15 días. Precios en pesos mexicanos.</p>
      </div>
    </div>
  );
}

// ─── Cronograma (jornales → semanas) ─────────────────────────────────────────
function Cronograma({ budget, onChange }: { budget: Budget | null; onChange: (b: Budget) => void }) {
  const [personas, setPersonas] = useState(budget?.personas ?? 2);
  if (!budget || budget.lineas.length === 0)
    return <div className={`${CARD} py-14 px-6 text-center text-sm text-[#7A7A7A]`}>Arma primero el presupuesto para calcular el cronograma.</div>;

  const b = budget;
  const p = Math.max(1, personas);
  const capSemana = 5 * p; // jornales por semana (5 días × personas)
  const totalJornales = budgetTotals(b).jornadas;
  const dias = totalJornales / p;

  async function guardarPersonas(v: number) {
    const next = { ...b, personas: v };
    onChange(next);
    await fetch(`/api/costos/budgets/${b.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personas: v }),
    });
  }

  // Asignación secuencial de cada concepto a semanas.
  let acum = 0;
  const filas = b.lineas.map((l) => {
    const j = (l.tiempoPU ?? 0) * l.cantidad;
    const ini = Math.floor(acum / capSemana) + 1;
    acum += j;
    const fin = Math.max(ini, Math.ceil(acum / capSemana));
    return { l, j, ini, fin };
  });

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <label className="text-xs text-[#7A7A7A] flex items-center gap-2">Cuadrilla (personas)
          <input type="number" min={1} value={personas} onChange={(e) => setPersonas(Number(e.target.value) || 1)} onBlur={(e) => guardarPersonas(Number(e.target.value) || 1)} className={INPUT + " w-20"} />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-4 mb-5">
        <Stat label="Jornales" val={totalJornales.toFixed(2)} />
        <Stat label="Días" val={dias.toFixed(1)} />
        <Stat label="Semanas" val={(dias / 5).toFixed(1)} />
        <Stat label="Meses" val={(dias / 20).toFixed(1)} />
      </div>
      <div className={`${CARD} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[#7A7A7A] text-xs uppercase tracking-wider border-b border-[#EDE9E0]">
              <th className="px-3 py-3 font-semibold">Concepto</th>
              <th className="px-3 py-3 font-semibold text-right">Jornales</th>
              <th className="px-3 py-3 font-semibold text-right">Semana</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f, i) => (
              <tr key={i} className="border-b border-[#F5F2EC]">
                <td className="px-3 py-2 text-[#2C2C2C]">{f.l.concepto || f.l.descripcion}</td>
                <td className="px-3 py-2 text-right data-label">{f.j.toFixed(2)}</td>
                <td className="px-3 py-2 text-right data-label text-[#7A7A7A]">{f.ini === f.fin ? f.ini : `${f.ini}–${f.fin}`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[#7A7A7A] mt-2">Jornales = tiempo por unidad × cantidad. Semanas asumen {p} persona(s) a 5 días ({capSemana} jornales/semana).</p>
    </div>
  );
}

function Stat({ label, val }: { label: string; val: string }) {
  return (
    <div className={`${CARD} p-4`}>
      <p className="text-[#1B2A5E] text-2xl data-label" style={{ fontFamily: "var(--font-playfair)" }}>{val}</p>
      <p className="text-[#7A7A7A] text-xs uppercase tracking-wider mt-1">{label}</p>
    </div>
  );
}

// ─── Administración (movimientos del proyecto) ───────────────────────────────
const CATEGORIAS = ["anticipo", "finiquito", "pago", "egreso", "indirectos", "impuestos", "nómina", "otro"];

function Administracion({ proyecto, budget, inicial }: { proyecto: Project; budget: Budget | null; inicial: LedgerEntry[] }) {
  const [items, setItems] = useState<LedgerEntry[]>(inicial);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ fecha: new Date().toISOString().slice(0, 10), categoria: "anticipo", tipo: "ingreso" as LedgerEntry["tipo"], concepto: "", monto: "" });

  async function crear() {
    setBusy(true);
    const res = await fetch("/api/costos/ledger", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...f, projectId: proyecto.id, monto: Number(f.monto) || 0 }),
    });
    setBusy(false);
    if (res.ok) { const { entry } = await res.json(); setItems((xs) => [...xs, entry]); setF({ ...f, concepto: "", monto: "" }); }
  }
  async function borrar(id: string) {
    if (!confirm("¿Eliminar movimiento?")) return;
    if ((await fetch(`/api/costos/ledger/${id}`, { method: "DELETE" })).ok) setItems((xs) => xs.filter((x) => x.id !== id));
  }

  const ingresos = items.filter((e) => e.tipo === "ingreso").reduce((a, e) => a + e.monto, 0);
  const egresos = items.filter((e) => e.tipo === "egreso").reduce((a, e) => a + e.monto, 0);
  const contratado = budget ? budgetTotals(budget).total : 0;

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-4 mb-5">
        <Stat label="Ingresos" val={money(ingresos)} />
        <Stat label="Egresos" val={money(egresos)} />
        <Stat label="Balance" val={money(ingresos - egresos)} />
        <Stat label="Contratado (cotización)" val={money(contratado)} />
      </div>
      <div className={`${CARD} p-4 mb-4 flex flex-wrap items-end gap-2`}>
        <input type="date" value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} className={INPUT} />
        <select value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })} className={INPUT}>
          {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value as LedgerEntry["tipo"] })} className={INPUT}>
          <option value="ingreso">Ingreso</option>
          <option value="egreso">Egreso</option>
        </select>
        <input placeholder="Concepto" value={f.concepto} onChange={(e) => setF({ ...f, concepto: e.target.value })} className={INPUT + " flex-1 min-w-[160px]"} />
        <input type="number" placeholder="Monto" value={f.monto} onChange={(e) => setF({ ...f, monto: e.target.value })} className={INPUT + " w-32"} />
        <button onClick={crear} disabled={busy} className={BTN_PRIMARY}><Plus size={14} /> Agregar</button>
      </div>
      <div className={`${CARD} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[#7A7A7A] text-xs uppercase tracking-wider border-b border-[#EDE9E0]">
              <th className="px-3 py-3 font-semibold">Fecha</th>
              <th className="px-3 py-3 font-semibold">Categoría</th>
              <th className="px-3 py-3 font-semibold">Concepto</th>
              <th className="px-3 py-3 font-semibold text-right">Monto</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {items.map((e) => (
              <tr key={e.id} className="border-b border-[#F5F2EC]">
                <td className="px-3 py-2 data-label text-[#7A7A7A]">{e.fecha}</td>
                <td className="px-3 py-2 text-[#7A7A7A]">{e.categoria}</td>
                <td className="px-3 py-2 text-[#2C2C2C]">{e.concepto || "—"}</td>
                <td className={`px-3 py-2 text-right data-label ${e.tipo === "ingreso" ? "text-green-700" : "text-[#2C2C2C]"}`}>{e.tipo === "egreso" ? "−" : ""}{money(e.monto)}</td>
                <td className="px-3 py-2 text-right"><button onClick={() => borrar(e.id)} className="text-[#7A7A7A] hover:text-red-500"><Trash2 size={14} /></button></td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-[#7A7A7A]">Sin movimientos.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Nómina del proyecto ─────────────────────────────────────────────────────
function Nomina({ proyecto, inicial }: { proyecto: Project; inicial: PayrollEntry[] }) {
  const [items, setItems] = useState<PayrollEntry[]>(inicial);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ persona: "", rol: "", periodo: "", monto: "" });

  async function crear() {
    if (!f.persona.trim()) return;
    setBusy(true);
    const res = await fetch("/api/costos/payroll", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...f, projectId: proyecto.id, monto: Number(f.monto) || 0 }),
    });
    setBusy(false);
    if (res.ok) { const { entry } = await res.json(); setItems((xs) => [...xs, entry]); setF({ persona: "", rol: "", periodo: "", monto: "" }); }
  }
  async function togglePagado(e: PayrollEntry) {
    const res = await fetch(`/api/costos/payroll/${e.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pagado: !e.pagado }),
    });
    if (res.ok) setItems((xs) => xs.map((x) => (x.id === e.id ? { ...x, pagado: !e.pagado } : x)));
  }
  async function borrar(id: string) {
    if (!confirm("¿Eliminar pago?")) return;
    if ((await fetch(`/api/costos/payroll/${id}`, { method: "DELETE" })).ok) setItems((xs) => xs.filter((x) => x.id !== id));
  }

  const total = items.reduce((a, e) => a + e.monto, 0);
  const pagado = items.filter((e) => e.pagado).reduce((a, e) => a + e.monto, 0);

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-3 mb-5">
        <Stat label="Total nómina" val={money(total)} />
        <Stat label="Pagado" val={money(pagado)} />
        <Stat label="Por pagar" val={money(total - pagado)} />
      </div>
      <div className={`${CARD} p-4 mb-4 flex flex-wrap items-end gap-2`}>
        <input placeholder="Persona" value={f.persona} onChange={(e) => setF({ ...f, persona: e.target.value })} className={INPUT + " flex-1 min-w-[160px]"} />
        <input placeholder="Rol" value={f.rol} onChange={(e) => setF({ ...f, rol: e.target.value })} className={INPUT + " w-40"} />
        <input placeholder="Periodo" value={f.periodo} onChange={(e) => setF({ ...f, periodo: e.target.value })} className={INPUT + " w-32"} />
        <input type="number" placeholder="Monto" value={f.monto} onChange={(e) => setF({ ...f, monto: e.target.value })} className={INPUT + " w-32"} />
        <button onClick={crear} disabled={busy} className={BTN_PRIMARY}><Plus size={14} /> Agregar</button>
      </div>
      <div className={`${CARD} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[#7A7A7A] text-xs uppercase tracking-wider border-b border-[#EDE9E0]">
              <th className="px-3 py-3 font-semibold">Persona</th>
              <th className="px-3 py-3 font-semibold">Rol</th>
              <th className="px-3 py-3 font-semibold">Periodo</th>
              <th className="px-3 py-3 font-semibold text-right">Monto</th>
              <th className="px-3 py-3 font-semibold text-center">Pagado</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {items.map((e) => (
              <tr key={e.id} className="border-b border-[#F5F2EC]">
                <td className="px-3 py-2 text-[#2C2C2C]">{e.persona}</td>
                <td className="px-3 py-2 text-[#7A7A7A]">{e.rol || "—"}</td>
                <td className="px-3 py-2 text-[#7A7A7A] data-label">{e.periodo || "—"}</td>
                <td className="px-3 py-2 text-right data-label">{money(e.monto)}</td>
                <td className="px-3 py-2 text-center">
                  <button onClick={() => togglePagado(e)} className={`text-xs px-2 py-0.5 border ${e.pagado ? "bg-green-50 text-green-700 border-green-200" : "bg-[#F5F2EC] text-[#7A7A7A] border-[#EDE9E0]"}`}>{e.pagado ? "Sí" : "No"}</button>
                </td>
                <td className="px-3 py-2 text-right"><button onClick={() => borrar(e.id)} className="text-[#7A7A7A] hover:text-red-500"><Trash2 size={14} /></button></td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-[#7A7A7A]">Sin pagos registrados.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
