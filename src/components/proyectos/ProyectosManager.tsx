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
  Construction,
  Plus,
  Trash2,
  Save,
  Printer,
} from "lucide-react";
import type { Project, Budget, BudgetLine } from "@/lib/db";
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
}: {
  proyectos: Project[];
  budgets: Budget[];
  conceptos: ConceptoLite[];
}) {
  const [selId, setSelId] = useState<string | null>(null);
  const sel = proyectos.find((p) => p.id === selId) || null;

  if (sel) {
    return (
      <ProyectoDetalle
        proyecto={sel}
        budgetInicial={budgets.find((b) => b.projectId === sel.id) || null}
        conceptos={conceptos}
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
  onBack,
}: {
  proyecto: Project;
  budgetInicial: Budget | null;
  conceptos: ConceptoLite[];
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
      {(tab === "cronograma" || tab === "administracion" || tab === "nomina") && (
        <Scaffold tab={tab} budget={budget} />
      )}
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
      <div className="flex justify-end mb-3" data-no-print>
        <button onClick={() => window.print()} className={BTN_PRIMARY}><Printer size={14} /> Imprimir / PDF</button>
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

// ─── Hojas aún por construir (Fase 4) ────────────────────────────────────────
function Scaffold({ tab, budget }: { tab: SubTab; budget: Budget | null }) {
  const info: Record<string, { label: string; hoja: string; desc: string }> = {
    cronograma: { label: "Cronograma", hoja: "CRONO", desc: "Distribuye las jornadas del presupuesto por semanas." },
    administracion: { label: "Administración", hoja: "ADMINISTRACIÓN", desc: "Anticipo, finiquito, egresos y utilidad: lo real contra lo presupuestado." },
    nomina: { label: "Nómina", hoja: "NÓMINA", desc: "Nómina del proyecto por persona y periodo." },
  };
  const i = info[tab];
  const jornadas = budget ? budgetTotals(budget).jornadas : 0;
  return (
    <div className={`${CARD} p-8`}>
      <span className="data-label text-xs uppercase tracking-widest text-[#C9A84C]">Hoja: {i.hoja}</span>
      <h3 className="text-[#1B2A5E] text-xl mb-2 mt-1" style={{ fontFamily: "var(--font-playfair)" }}>{i.label}</h3>
      <p className="text-sm text-[#2C2C2C] max-w-2xl">{i.desc}</p>
      {tab === "cronograma" && budget && (
        <p className="mt-3 text-sm text-[#1B2A5E] data-label">Jornadas totales del presupuesto actual: <strong>{jornadas.toFixed(2)}</strong></p>
      )}
      <div className="mt-6 flex items-center gap-2 text-sm text-[#7A7A7A] bg-[#F5F2EC] border border-[#EDE9E0] px-4 py-3">
        <Construction size={16} className="text-[#C9A84C] shrink-0" /> Módulo en construcción (Fase 4).
      </div>
    </div>
  );
}
