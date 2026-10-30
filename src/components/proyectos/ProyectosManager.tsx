"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Calculator,
  FileText,
  CalendarRange,
  Wallet,
  Users,
  UserPlus,
  ChevronLeft,
  MapPin,
  ArrowRight,
  Plus,
  Trash2,
  Printer,
  Download,
  Scale,
  Clock,
  Eye,
  Pencil,
} from "lucide-react";
import CarpetaInformesPicker from "@/components/proyectos/CarpetaInformesPicker";
import type {
  Project,
  Budget,
  LedgerEntry,
  PayrollEntry,
  CostInputKind,
} from "@/lib/db";
import { budgetTotals } from "@/lib/pu";
import { Builder as PresupuestoCarrito, type CatalogProps } from "@/components/presupuesto/PresupuestoManager";

/** Empleado (lista para Participantes). */
export interface EmpleadoLite {
  id: string;
  nombre: string;
  rol: string;
  proyectoIds: string[];
  proyectoEdita?: string[];
}

/** Concepto de la biblioteca, con su P.U. y desglose por tipo ya calculados. */
export interface ConceptoLite {
  id: string;
  clave: string;
  concepto: string;
  descripcion: string;
  unidad: string;
  pu: number;
  tiempoPU: number | null;
  porTipo: Record<CostInputKind, number>;
}

const mxn = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
const money = (n: number) => mxn.format(Number.isFinite(n) ? n : 0);
const pct = (n: number) => `${(n * 100).toFixed(0)}%`;

const CARD = "bg-white border border-[#EDE9E0]";
const BTN_PRIMARY =
  "flex items-center gap-2 bg-[#1B2A5E] text-[#F5F2EC] px-4 py-2.5 text-xs tracking-widest uppercase font-semibold hover:bg-[#243470] disabled:opacity-60";
const INPUT =
  "border border-[#EDE9E0] bg-white px-3 py-2 text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A84C]";

type SubTab =
  | "presupuesto"
  | "cotizacion"
  | "cronograma"
  | "balance"
  | "administracion"
  | "participantes"
  | "nomina";

const SUBTABS: { id: SubTab; label: string; icon: React.ElementType }[] = [
  { id: "presupuesto", label: "Presupuesto", icon: Calculator },
  { id: "cotizacion", label: "Cotización", icon: FileText },
  { id: "cronograma", label: "Cronograma", icon: CalendarRange },
  { id: "balance", label: "Balance", icon: Scale },
  { id: "administracion", label: "Administración", icon: Wallet },
  { id: "participantes", label: "Participantes", icon: UserPlus },
  { id: "nomina", label: "Nómina", icon: Users },
];

const ESTADO: Record<Project["estado"], { label: string; cls: string }> = {
  activo: { label: "Activo", cls: "bg-green-50 text-green-700 border-green-200" },
  finalizado: { label: "Finalizado", cls: "bg-[#F5F2EC] text-[#7A7A7A] border-[#EDE9E0]" },
  futuro: { label: "Futuro", cls: "bg-[#1B2A5E]/5 text-[#1B2A5E] border-[#1B2A5E]/20" },
};

const ESTADO_FILTROS: { id: "todos" | Project["estado"]; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "activo", label: "Activos" },
  { id: "futuro", label: "En proceso" },
  { id: "finalizado", label: "Finalizados" },
];

export default function ProyectosManager({
  proyectos,
  budgets,
  conceptos,
  ledger,
  payroll,
  empleados,
  catalog,
}: {
  proyectos: Project[];
  budgets: Budget[];
  conceptos: ConceptoLite[];
  ledger: LedgerEntry[];
  payroll: PayrollEntry[];
  empleados: EmpleadoLite[];
  catalog: CatalogProps;
}) {
  const [selId, setSelId] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<"todos" | Project["estado"]>("todos");
  const sel = proyectos.find((p) => p.id === selId) || null;

  if (sel) {
    return (
      <ProyectoDetalle
        proyecto={sel}
        budgetInicial={budgets.find((b) => b.projectId === sel.id) || null}
        conceptos={conceptos}
        catalog={catalog}
        empleados={empleados}
        ledgerInicial={ledger.filter((e) => e.projectId === sel.id)}
        payrollInicial={payroll.filter((e) => e.projectId === sel.id)}
        onBack={() => setSelId(null)}
      />
    );
  }

  const visibles = filtro === "todos" ? proyectos : proyectos.filter((p) => p.estado === filtro);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {ESTADO_FILTROS.map((f) => {
          const on = filtro === f.id;
          const n = f.id === "todos" ? proyectos.length : proyectos.filter((p) => p.estado === f.id).length;
          return (
            <button key={f.id} onClick={() => setFiltro(f.id)}
              className={`px-3 py-1.5 text-xs tracking-wider uppercase font-semibold border transition-colors ${on ? "bg-[#1B2A5E] text-[#F5F2EC] border-[#1B2A5E]" : "border-[#EDE9E0] text-[#7A7A7A] hover:border-[#C9A84C]"}`}>
              {f.label} <span className={on ? "text-[#C9A84C]" : "text-[#C9A84C]"}>{n}</span>
            </button>
          );
        })}
      </div>
      {proyectos.length === 0 ? (
        <div className={`${CARD} py-16 px-6 text-center text-sm text-[#7A7A7A]`}>
          No hay proyectos todavía. Crea uno en{" "}
          <Link href="/dashboard/admin/personal" className="text-[#1B2A5E] underline hover:text-[#C9A84C]">Personal y permisos</Link>{" "}
          y aparecerá aquí para presupuestar.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibles.map((p) => {
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
  catalog,
  empleados,
  ledgerInicial,
  payrollInicial,
  onBack,
}: {
  proyecto: Project;
  budgetInicial: Budget | null;
  conceptos: ConceptoLite[];
  catalog: CatalogProps;
  empleados: EmpleadoLite[];
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
        <CarpetaInformesPicker projectId={proyecto.id} projectNombre={proyecto.nombre} initial={proyecto.carpetaInformes || ""} />
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
        <PresupuestoProyecto proyecto={proyecto} budget={budget} conceptos={conceptos} catalog={catalog} onChange={setBudget} />
      )}
      {tab === "cotizacion" && <Cotizacion proyecto={proyecto} budget={budget} />}
      {tab === "cronograma" && <Cronograma budget={budget} onChange={setBudget} />}
      {tab === "balance" && <Balance budget={budget} conceptos={conceptos} ledger={ledgerInicial} payroll={payrollInicial} />}
      {tab === "administracion" && <Administracion proyecto={proyecto} budget={budget} inicial={ledgerInicial} catalog={catalog} />}
      {tab === "participantes" && <Participantes proyecto={proyecto} empleados={empleados} catalog={catalog} />}
      {tab === "nomina" && <Nomina proyecto={proyecto} inicial={payrollInicial} empleados={empleados} catalog={catalog} />}
    </div>
  );
}

// ─── Presupuesto del proyecto (tienda/carrito) ───────────────────────────────
// Reutiliza el armador de la sección Presupuesto: catálogo (materiales, recetas,
// salarios, conceptos) → agregar al presupuesto de ESTE proyecto.
function PresupuestoProyecto({
  proyecto,
  budget,
  conceptos,
  catalog,
  onChange,
}: {
  proyecto: Project;
  budget: Budget | null;
  conceptos: ConceptoLite[];
  catalog: CatalogProps;
  onChange: (b: Budget) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function crear() {
    setBusy(true);
    const res = await fetch("/api/costos/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: proyecto.id,
        nombre: `Presupuesto ${proyecto.nombre}`,
        obra: proyecto.nombre,
        cliente: proyecto.cliente || "",
        lineas: [],
      }),
    });
    setBusy(false);
    if (res.ok) onChange((await res.json()).budget);
  }

  if (!budget) {
    return (
      <div className={`${CARD} py-14 px-6 text-center`}>
        <p className="text-sm text-[#7A7A7A] mb-4">
          Este proyecto aún no tiene presupuesto. Créalo y agrégale materiales,
          recetas, salarios y conceptos del catálogo.
        </p>
        <button onClick={crear} disabled={busy} className={BTN_PRIMARY + " mx-auto"}><Plus size={14} /> Crear presupuesto</button>
      </div>
    );
  }

  return (
    <PresupuestoCarrito budget={budget} conceptos={conceptos} catalog={catalog} onChange={onChange} />
  );
}

// ─── Cotización (vista imprimible / PDF) ─────────────────────────────────────
function Cotizacion({ proyecto, budget }: { proyecto: Project; budget: Budget | null }) {
  if (!budget || budget.lineas.length === 0)
    return <div className={`${CARD} py-14 px-6 text-center text-sm text-[#7A7A7A]`}>Arma primero el presupuesto en la pestaña Presupuesto.</div>;
  // La cotización al contratista es un listado de CONCEPTOS (los materiales,
  // recetas y personal son el armado interno del presupuesto). Si aún no hay
  // conceptos, se muestran todas las partidas como respaldo.
  const soloConceptos = budget.lineas.filter((l) => l.conceptId);
  const lineas = soloConceptos.length ? soloConceptos : budget.lineas;
  const subtotal = lineas.reduce((a, l) => a + l.pu * l.cantidad, 0);
  const iva = subtotal * budget.factorIva;
  const totals = { subtotal, iva, total: subtotal + iva };
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
            {lineas.map((l, i) => (
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

// ─── Balance económico (presupuestado vs real) ───────────────────────────────
type Bucket = "mano_obra" | "material" | "herramienta" | "equipo" | "viaticos" | "indirectos" | "impuestos" | "otro";
const BUCKET: Record<string, Bucket> = {
  "mano de obra": "mano_obra", material: "material", herramienta: "herramienta",
  equipo: "equipo", "viáticos": "viaticos", viaticos: "viaticos", indirectos: "indirectos", impuestos: "impuestos",
};
const bucketOf = (cat: string): Bucket => BUCKET[cat.toLowerCase()] ?? "otro";

function Balance({ budget, conceptos, ledger, payroll }: {
  budget: Budget | null;
  conceptos: ConceptoLite[];
  ledger: LedgerEntry[];
  payroll: PayrollEntry[];
}) {
  if (!budget || budget.lineas.length === 0)
    return <div className={`${CARD} py-14 px-6 text-center text-sm text-[#7A7A7A]`}>Arma primero el presupuesto para comparar contra lo real.</div>;

  // Presupuestado por rubro: desglose de cada concepto × cantidad.
  const byId = new Map(conceptos.map((c) => [c.id, c]));
  const pres = { mano_obra: 0, material: 0, herramienta: 0, equipo: 0 };
  for (const l of budget.lineas) {
    const c = l.conceptId ? byId.get(l.conceptId) : undefined;
    if (!c) continue;
    pres.mano_obra += c.porTipo.mano_obra * l.cantidad;
    pres.material += (c.porTipo.material + c.porTipo.receta) * l.cantidad;
    pres.herramienta += c.porTipo.herramienta * l.cantidad;
    pres.equipo += c.porTipo.equipo * l.cantidad;
  }
  const cdPres = pres.mano_obra + pres.material + pres.herramienta + pres.equipo;
  const ciPres = cdPres * budget.factorIndirectos;
  const t = budgetTotals(budget);
  const utilPres = t.subtotal - cdPres - ciPres;

  // Real por rubro: egresos del ledger (por categoría) + nómina del proyecto.
  const real: Record<Bucket, number> = { mano_obra: 0, material: 0, herramienta: 0, equipo: 0, viaticos: 0, indirectos: 0, impuestos: 0, otro: 0 };
  for (const e of ledger) if (e.tipo === "egreso") real[bucketOf(e.categoria)] += e.monto;
  real.mano_obra += payroll.reduce((a, e) => a + e.monto, 0);
  const ingresos = ledger.filter((e) => e.tipo === "ingreso").reduce((a, e) => a + e.monto, 0);
  const costoReal = (Object.values(real) as number[]).reduce((a, n) => a + n, 0);
  const utilReal = ingresos - costoReal;

  const rows: { label: string; p: number; r: number }[] = [
    { label: "Mano de obra", p: pres.mano_obra, r: real.mano_obra },
    { label: "Material", p: pres.material, r: real.material },
    { label: "Herramienta", p: pres.herramienta, r: real.herramienta },
    { label: "Equipo", p: pres.equipo, r: real.equipo },
    { label: "Indirectos", p: ciPres, r: real.indirectos },
    { label: "Viáticos", p: 0, r: real.viaticos },
    { label: "Impuestos", p: 0, r: real.impuestos },
  ];
  if (real.otro) rows.push({ label: "Otros", p: 0, r: real.otro });

  const dif = (p: number, r: number) => (
    <span className={p - r >= 0 ? "text-green-700" : "text-red-600"}>{money(p - r)}</span>
  );

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-4 mb-5">
        <Stat label="Contratado (cotización)" val={money(t.total)} />
        <Stat label="Ingresos cobrados" val={money(ingresos)} />
        <Stat label="Costo real" val={money(costoReal)} />
        <Stat label="Utilidad real" val={money(utilReal)} />
      </div>
      <div className={`${CARD} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[#7A7A7A] text-xs uppercase tracking-wider border-b border-[#EDE9E0]">
              <th className="px-3 py-3 font-semibold">Rubro</th>
              <th className="px-3 py-3 font-semibold text-right">Presupuestado</th>
              <th className="px-3 py-3 font-semibold text-right">Real</th>
              <th className="px-3 py-3 font-semibold text-right">Diferencia</th>
            </tr>
          </thead>
          <tbody className="data-label">
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-[#F5F2EC]">
                <td className="px-3 py-2 text-[#2C2C2C]">{row.label}</td>
                <td className="px-3 py-2 text-right text-[#7A7A7A]">{money(row.p)}</td>
                <td className="px-3 py-2 text-right text-[#2C2C2C]">{money(row.r)}</td>
                <td className="px-3 py-2 text-right">{dif(row.p, row.r)}</td>
              </tr>
            ))}
            <tr className="border-t border-[#1B2A5E] font-semibold text-[#1B2A5E]">
              <td className="px-3 py-2">Costo total</td>
              <td className="px-3 py-2 text-right">{money(cdPres + ciPres)}</td>
              <td className="px-3 py-2 text-right">{money(costoReal)}</td>
              <td className="px-3 py-2 text-right">{dif(cdPres + ciPres, costoReal)}</td>
            </tr>
            <tr className="font-semibold text-[#C9A84C]">
              <td className="px-3 py-2">Utilidad</td>
              <td className="px-3 py-2 text-right">{money(utilPres)}</td>
              <td className="px-3 py-2 text-right">{money(utilReal)}</td>
              <td className="px-3 py-2 text-right">{dif(utilReal, utilPres)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[#7A7A7A] mt-2">
        Presupuestado: desglose de los conceptos de la cotización. Real: egresos de Administración (por categoría) + nómina del proyecto. Registra los gastos en Administración con la categoría del rubro para que el balance cuadre.
      </p>
    </div>
  );
}

// ─── Cronograma (jornales → calendario con Gantt gráfico) ────────────────────
// Días de la semana en orden laboral (lunes→domingo). getDay(): 0=Dom … 6=Sáb.
const DIAS_SEMANA: { d: number; label: string }[] = [
  { d: 1, label: "L" }, { d: 2, label: "M" }, { d: 3, label: "M" },
  { d: 4, label: "J" }, { d: 5, label: "V" }, { d: 6, label: "S" }, { d: 0, label: "D" },
];

/** Offsets de inicio acumulados (en días laborables) para una lista de duraciones. */
function offsetsAcumulados(durs: number[]): number[] {
  const out: number[] = [];
  let s = 0;
  for (const d of durs) { out.push(s); s += d; }
  return out;
}

/** Fecha del n-ésimo día laborable (0 = primer laborable en/después de `start`),
 *  saltando los días marcados como descanso. */
function diaLaborable(start: Date, descanso: Set<number>, n: number): Date {
  const d = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  while (descanso.has(d.getDay())) d.setDate(d.getDate() + 1);
  let hechos = 0;
  while (hechos < n) {
    d.setDate(d.getDate() + 1);
    if (!descanso.has(d.getDay())) hechos += 1;
  }
  return d;
}

const fmtDia = (d: Date) => d.toLocaleDateString("es-MX", { day: "2-digit", month: "short" });

/** A partir de una fecha, deriva la quincena: periodo "YYYY-MM Q1|Q2", días de
 *  la quincena (calendario) y la fecha representativa (fin de quincena). */
function quincenaDe(fechaISO: string): { periodo: string; diasQuincena: number; fecha: string } {
  const d = new Date(fechaISO + "T00:00:00");
  const y = d.getFullYear(), m = d.getMonth(), day = d.getDate();
  const diasMes = new Date(y, m + 1, 0).getDate();
  const q = day <= 15 ? 1 : 2;
  const ym = `${y}-${String(m + 1).padStart(2, "0")}`;
  return {
    periodo: `${ym} Q${q}`,
    diasQuincena: q === 1 ? 15 : diasMes - 15,
    fecha: q === 1 ? `${ym}-15` : `${ym}-${String(diasMes).padStart(2, "0")}`,
  };
}

function Cronograma({ budget, onChange }: { budget: Budget | null; onChange: (b: Budget) => void }) {
  const [personas, setPersonas] = useState(budget?.personas ?? 2);
  const [inicioStr, setInicioStr] = useState(budget?.cronoInicio || new Date().toISOString().slice(0, 10));
  const [descanso, setDescanso] = useState<number[]>(budget?.cronoDescanso ?? [0]); // domingo por defecto
  if (!budget || budget.lineas.length === 0)
    return <div className={`${CARD} py-14 px-6 text-center text-sm text-[#7A7A7A]`}>Arma primero el presupuesto para calcular el cronograma.</div>;

  const b = budget;
  const p = Math.max(1, personas);
  const totalJornales = budgetTotals(b).jornadas;

  // Descanso efectivo: si marcaran los 7 días, se ignora para no dejar 0 laborables.
  const restSet = new Set(descanso.length >= 7 ? [] : descanso);
  const diasLaborSem = Math.max(1, 7 - restSet.size);
  const inicio = new Date(inicioStr + "T00:00:00");

  // Duración de cada concepto en días laborables = jornales / cuadrilla.
  const durs = b.lineas.map((l) => ((l.tiempoPU ?? 0) * l.cantidad) / p);
  const starts = offsetsAcumulados(durs);
  const totalDias = durs.reduce((a, d) => a + d, 0);
  const fechaFin = totalDias > 0 ? diaLaborable(inicio, restSet, Math.max(0, Math.ceil(totalDias) - 1)) : inicio;

  const filas = b.lineas.map((l, i) => {
    const dur = durs[i];
    const so = starts[i];
    const ini = diaLaborable(inicio, restSet, Math.floor(so));
    const fin = diaLaborable(inicio, restSet, Math.max(Math.floor(so), Math.ceil(so + dur) - 1));
    const left = totalDias > 0 ? (so / totalDias) * 100 : 0;
    const width = totalDias > 0 ? Math.max(1.5, (dur / totalDias) * 100) : 0;
    const jornales = (l.tiempoPU ?? 0) * l.cantidad;
    return { l, dur, jornales, ini, fin, left, width };
  });

  // Guarda los parámetros del cronograma en el presupuesto del proyecto, para
  // que cada obra conserve el suyo y pueda consultarse (y, más adelante,
  // mostrarse en el panel del empleado y de los involucrados).
  async function guardarCrono(patch: Partial<Budget>) {
    onChange({ ...b, ...patch });
    await fetch(`/api/costos/budgets/${b.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  }

  function toggleDescanso(d: number) {
    const next = descanso.includes(d) ? descanso.filter((x) => x !== d) : [...descanso, d];
    setDescanso(next);
    guardarCrono({ cronoDescanso: next });
  }

  return (
    <div>
      <div className={`${CARD} p-4 mb-5 flex flex-wrap items-end gap-5`}>
        <label className="text-xs text-[#7A7A7A] flex flex-col gap-1">Fecha de inicio
          <input type="date" value={inicioStr} onChange={(e) => { setInicioStr(e.target.value); guardarCrono({ cronoInicio: e.target.value }); }} className={INPUT + " w-44"} />
        </label>
        <label className="text-xs text-[#7A7A7A] flex flex-col gap-1">Cuadrilla (personas)
          <input type="number" min={1} value={personas} onChange={(e) => setPersonas(Number(e.target.value) || 1)} onBlur={(e) => guardarCrono({ personas: Number(e.target.value) || 1 })} className={INPUT + " w-24"} />
        </label>
        <div className="text-xs text-[#7A7A7A] flex flex-col gap-1">Días de descanso
          <div className="flex gap-1">
            {DIAS_SEMANA.map((x) => {
              const on = descanso.includes(x.d);
              return (
                <button key={x.d} type="button" onClick={() => toggleDescanso(x.d)} title={on ? "Descanso" : "Laborable"}
                  className={`w-8 h-9 text-xs font-semibold border transition-colors ${on ? "bg-[#1B2A5E] text-[#F5F2EC] border-[#1B2A5E]" : "bg-white text-[#7A7A7A] border-[#EDE9E0] hover:border-[#C9A84C]"}`}>
                  {x.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4 mb-5">
        <Stat label="Jornales" val={totalJornales.toFixed(2)} />
        <Stat label="Días laborables" val={totalDias.toFixed(1)} />
        <Stat label="Semanas" val={(totalDias / diasLaborSem).toFixed(1)} />
        <Stat label="Entrega" val={fmtDia(fechaFin)} />
      </div>

      {/* Gantt gráfico: una barra por concepto en la línea de tiempo. */}
      <div className={`${CARD} p-4`}>
        <div className="flex items-center justify-between text-xs text-[#7A7A7A] mb-3 data-label">
          <span>Inicio · {fmtDia(diaLaborable(inicio, restSet, 0))}</span>
          <span>Entrega · {fmtDia(fechaFin)}</span>
        </div>
        <div className="space-y-1.5">
          {filas.map((f, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-44 shrink-0 min-w-0">
                <p className="truncate text-xs text-[#2C2C2C]" title={f.l.concepto || f.l.descripcion}>{f.l.concepto || f.l.descripcion}</p>
                {f.l.cuadrilla && f.l.cuadrilla.length > 0 && (
                  <p className="truncate text-[10px] text-[#7A7A7A]" title={f.l.cuadrilla.map((r) => `${r.rol}: ${r.jornadas} jor`).join(" · ")}>
                    {f.l.cuadrilla.map((r) => `${r.rol} (${r.jornadas} jor)`).join(" · ")}
                  </p>
                )}
              </div>
              <div className="flex-1 relative h-6 bg-[#F5F2EC]">
                <div className="absolute top-0 h-6 bg-[#C9A84C]" style={{ left: `${f.left}%`, width: `${f.width}%` }}
                  title={`${f.jornales.toFixed(2)} jornales · ${fmtDia(f.ini)} – ${fmtDia(f.fin)}`} />
              </div>
              <div className="w-36 shrink-0 text-right text-[11px] text-[#7A7A7A] data-label">{fmtDia(f.ini)} – {fmtDia(f.fin)}</div>
            </div>
          ))}
        </div>
      </div>
      <p className="text-xs text-[#7A7A7A] mt-2">Jornales = tiempo por unidad × cantidad. Duración = jornales ÷ cuadrilla, repartidos en {diasLaborSem} día(s) laborable(s) por semana desde la fecha de inicio. La fecha de inicio, la cuadrilla y los días de descanso se guardan en el proyecto.</p>
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
// Categorías alineadas a los rubros del balance (presupuestado vs real).
const CATEGORIAS = ["anticipo", "finiquito", "pago", "mano de obra", "material", "herramienta", "equipo", "viáticos", "indirectos", "impuestos", "otro"];

function Administracion({ proyecto, budget, inicial, catalog }: { proyecto: Project; budget: Budget | null; inicial: LedgerEntry[]; catalog: CatalogProps }) {
  const [items, setItems] = useState<LedgerEntry[]>(inicial);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ fecha: new Date().toISOString().slice(0, 10), categoria: "anticipo", tipo: "ingreso" as LedgerEntry["tipo"], concepto: "", monto: "" });
  const [verCat, setVerCat] = useState(""); // filtro de la tabla por categoría

  // Enlace con el catálogo: en Administración solo se jalan CONCEPTOS (los
  // materiales/recetas/personal se arman en Presupuesto). El campo Concepto
  // ofrece los conceptos del catálogo; al elegir uno, prellena el monto con su
  // P.U. (que ya incluye indirectos y utilidad). En cuanto se den de alta
  // conceptos en el catálogo, aparecen aquí automáticamente.
  const conceptoLabel = (c: (typeof catalog.conceptos)[number]) =>
    [c.clave, c.concepto || c.descripcion].filter(Boolean).join(" · ");
  function onConceptoChange(v: string) {
    const hit = catalog.conceptos.find((c) => conceptoLabel(c) === v);
    setF((prev) => (hit ? { ...prev, concepto: v, tipo: "egreso", monto: String(hit.pu) } : { ...prev, concepto: v }));
  }

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
        <input placeholder="Concepto (elige del catálogo o escribe)" list="admin-conceptos" value={f.concepto} onChange={(e) => onConceptoChange(e.target.value)} className={INPUT + " flex-1 min-w-[160px]"} />
        <datalist id="admin-conceptos">
          {catalog.conceptos.map((c) => <option key={c.id} value={conceptoLabel(c)}>{money(c.pu)}</option>)}
        </datalist>
        <input type="number" placeholder="Monto" value={f.monto} onChange={(e) => setF({ ...f, monto: e.target.value })} className={INPUT + " w-32"} />
        <button onClick={crear} disabled={busy} className={BTN_PRIMARY}><Plus size={14} /> Agregar</button>
      </div>
      {/* Barra de filtro por categoría */}
      {items.length > 0 && (() => {
        const catsMov = [...new Set(items.map((e) => e.categoria).filter(Boolean))].sort();
        return (
          <div className={`${CARD} px-3 py-2.5 mb-3 flex flex-wrap items-center gap-2`}>
            <span className="text-[11px] uppercase tracking-wider text-[#7A7A7A] mr-1">Categoría</span>
            {[{ id: "", label: "Todas" }, ...catsMov.map((c) => ({ id: c, label: c }))].map((c) => {
              const on = verCat === c.id;
              const n = c.id === "" ? items.length : items.filter((e) => e.categoria === c.id).length;
              return (
                <button key={c.id || "todas"} onClick={() => setVerCat(c.id)}
                  className={`px-3 py-1.5 text-xs tracking-wider uppercase font-semibold border transition-colors ${on ? "bg-[#1B2A5E] text-[#F5F2EC] border-[#1B2A5E]" : "border-[#EDE9E0] text-[#7A7A7A] hover:border-[#C9A84C]"}`}>
                  {c.label} <span className="text-[#C9A84C]">{n}</span>
                </button>
              );
            })}
          </div>
        );
      })()}

      {(() => {
        const visibles = verCat ? items.filter((e) => e.categoria === verCat) : items;
        const subIng = visibles.filter((e) => e.tipo === "ingreso").reduce((a, e) => a + e.monto, 0);
        const subEgr = visibles.filter((e) => e.tipo === "egreso").reduce((a, e) => a + e.monto, 0);
        return (
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
                {visibles.map((e) => (
                  <tr key={e.id} className="border-b border-[#F5F2EC]">
                    <td className="px-3 py-2 data-label text-[#7A7A7A]">{e.fecha}</td>
                    <td className="px-3 py-2 text-[#7A7A7A]">{e.categoria}</td>
                    <td className="px-3 py-2 text-[#2C2C2C]">{e.concepto || "—"}</td>
                    <td className={`px-3 py-2 text-right data-label ${e.tipo === "ingreso" ? "text-green-700" : "text-[#2C2C2C]"}`}>{e.tipo === "egreso" ? "−" : ""}{money(e.monto)}</td>
                    <td className="px-3 py-2 text-right"><button onClick={() => borrar(e.id)} className="text-[#7A7A7A] hover:text-red-500"><Trash2 size={14} /></button></td>
                  </tr>
                ))}
                {visibles.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-[#7A7A7A]">Sin movimientos.</td></tr>}
              </tbody>
              {visibles.length > 0 && (
                <tfoot className="data-label">
                  <tr className="border-t border-[#EDE9E0] text-[#7A7A7A]">
                    <td colSpan={3} className="px-3 py-2 text-right">{verCat ? `Subtotal «${verCat}»` : "Subtotal"}</td>
                    <td className="px-3 py-2 text-right text-[#1B2A5E] font-semibold">{money(subIng - subEgr)}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        );
      })()}
    </div>
  );
}

// ─── Participantes del proyecto ──────────────────────────────────────────────
// Selecciona empleados de la lista; quedan ligados al proyecto (aparece en su
// panel general) y su rol define la tarifa diaria para la nómina quincenal.
function tarifaDiaria(rol: string, salarios: CatalogProps["salarios"]): number | null {
  const s = salarios.find((x) => x.rol.trim().toLowerCase() === (rol || "").trim().toLowerCase());
  return s ? s.jornada : null;
}

function Participantes({ proyecto, empleados, catalog }: { proyecto: Project; empleados: EmpleadoLite[]; catalog: CatalogProps }) {
  const [emps, setEmps] = useState<EmpleadoLite[]>(empleados);
  const [sel, setSel] = useState("");
  const [busy, setBusy] = useState(false);

  const participa = (e: EmpleadoLite) => e.proyectoIds.includes(proyecto.id);
  const participantes = emps.filter(participa);
  const disponibles = emps.filter((e) => !participa(e));

  const puedeEditar = (e: EmpleadoLite) => (e.proyectoEdita || []).includes(proyecto.id);

  async function patchEmp(emp: EmpleadoLite, body: Partial<EmpleadoLite>) {
    setBusy(true);
    const res = await fetch(`/api/employees/${emp.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (res.ok) setEmps((xs) => xs.map((x) => (x.id === emp.id ? { ...x, ...body } : x)));
  }
  function agregar() {
    const emp = emps.find((e) => e.id === sel);
    if (!emp || participa(emp)) return;
    patchEmp(emp, { proyectoIds: [...emp.proyectoIds, proyecto.id] });
    setSel("");
  }
  function quitar(emp: EmpleadoLite) {
    if (!confirm(`¿Quitar a ${emp.nombre} de este proyecto?`)) return;
    patchEmp(emp, {
      proyectoIds: emp.proyectoIds.filter((id) => id !== proyecto.id),
      proyectoEdita: (emp.proyectoEdita || []).filter((id) => id !== proyecto.id),
    });
  }
  function toggleEdita(emp: EmpleadoLite) {
    const cur = emp.proyectoEdita || [];
    const next = puedeEditar(emp) ? cur.filter((id) => id !== proyecto.id) : [...cur, proyecto.id];
    patchEmp(emp, { proyectoEdita: next });
  }

  return (
    <div>
      <div className={`${CARD} p-4 mb-4 flex flex-wrap items-end gap-2`}>
        <label className="text-xs text-[#7A7A7A] flex flex-col gap-1 flex-1 min-w-[220px]">Agregar participante
          <select value={sel} onChange={(e) => setSel(e.target.value)} className={INPUT}>
            <option value="">Elegir empleado…</option>
            {disponibles.map((e) => <option key={e.id} value={e.id}>{e.nombre}{e.rol ? ` · ${e.rol}` : ""}</option>)}
          </select>
        </label>
        <button onClick={agregar} disabled={busy || !sel} className={BTN_PRIMARY}><Plus size={14} /> Agregar</button>
      </div>

      <div className={`${CARD} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[#7A7A7A] text-xs uppercase tracking-wider border-b border-[#EDE9E0]">
              <th className="px-3 py-3 font-semibold">Participante</th>
              <th className="px-3 py-3 font-semibold">Rol</th>
              <th className="px-3 py-3 font-semibold text-center">Acceso</th>
              <th className="px-3 py-3 font-semibold text-right">Tarifa diaria</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {participantes.map((e) => {
              const diaria = tarifaDiaria(e.rol, catalog.salarios);
              const edita = puedeEditar(e);
              return (
                <tr key={e.id} className="border-b border-[#F5F2EC]">
                  <td className="px-3 py-2 text-[#2C2C2C]">{e.nombre}</td>
                  <td className="px-3 py-2 text-[#7A7A7A]">{e.rol || "—"}</td>
                  <td className="px-3 py-2 text-center">
                    <button onClick={() => toggleEdita(e)} disabled={busy}
                      title={edita ? "Puede editar — clic para dejar solo lectura" : "Solo lectura — clic para permitir editar"}
                      className={`inline-flex items-center gap-1 px-2 py-1 text-xs border ${edita ? "bg-[#1B2A5E] text-[#F5F2EC] border-[#1B2A5E]" : "bg-white text-[#7A7A7A] border-[#EDE9E0] hover:border-[#C9A84C]"}`}>
                      {edita ? <><Pencil size={12} /> Edita</> : <><Eye size={12} /> Ve</>}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-right data-label text-[#7A7A7A]">{diaria != null ? money(diaria) : "—"}</td>
                  <td className="px-3 py-2 text-right"><button onClick={() => quitar(e)} className="text-[#7A7A7A] hover:text-red-500"><Trash2 size={14} /></button></td>
                </tr>
              );
            })}
            {participantes.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-[#7A7A7A]">Sin participantes. Agrega empleados para que vean este proyecto y entren a la nómina quincenal.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[#7A7A7A] mt-2">La tarifa diaria viene del catálogo de salarios según el rol. En Nómina usa «Generar quincena» para crear los pagos de los participantes.</p>
    </div>
  );
}

// ─── Nómina del proyecto ─────────────────────────────────────────────────────
function Nomina({ proyecto, inicial, empleados, catalog }: { proyecto: Project; inicial: PayrollEntry[]; empleados: EmpleadoLite[]; catalog: CatalogProps }) {
  const [items, setItems] = useState<PayrollEntry[]>(inicial);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ persona: "", rol: "", periodo: "", monto: "" });
  const [verRol, setVerRol] = useState("");
  const [verPeriodo, setVerPeriodo] = useState("");
  const [verPagado, setVerPagado] = useState<"" | "si" | "no">("");
  const [genFecha, setGenFecha] = useState(new Date().toISOString().slice(0, 10));

  const participantes = empleados.filter((e) => e.proyectoIds.includes(proyecto.id));

  // Enlace con el catálogo de salarios: elegir un rol prellena rol y monto
  // (jornada de 8 h). El usuario puede ajustar el monto según el periodo.
  function pickRol(id: string) {
    const s = catalog.salarios.find((x) => x.id === id);
    if (!s) return;
    setF((prev) => ({ ...prev, rol: s.rol, monto: String(s.jornada) }));
  }

  // Genera los pagos de la quincena para los participantes que aún no la tienen.
  async function generarQuincena() {
    const { periodo, diasQuincena, fecha } = quincenaDe(genFecha);
    if (participantes.length === 0) { alert("Agrega participantes al proyecto primero (pestaña Participantes)."); return; }
    setBusy(true);
    const nuevos: PayrollEntry[] = [];
    for (const emp of participantes) {
      const yaExiste = items.some((e) => e.periodo === periodo && (e.employeeId === emp.id || e.persona === emp.nombre));
      if (yaExiste) continue;
      const diaria = tarifaDiaria(emp.rol, catalog.salarios) ?? 0;
      const res = await fetch("/api/costos/payroll", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: proyecto.id, persona: emp.nombre, rol: emp.rol, periodo, fecha,
          categoria: "nómina", employeeId: emp.id, diaria, diasQuincena, diasTrabajados: diasQuincena, descuento: 0, pagado: false,
        }),
      });
      if (res.ok) nuevos.push((await res.json()).entry);
    }
    setBusy(false);
    if (nuevos.length) setItems((xs) => [...xs, ...nuevos]);
    else alert(`La quincena ${periodo} ya estaba generada para todos los participantes.`);
  }

  // Edita un campo quincenal; el servidor recalcula el monto y devuelve la fila.
  async function patchCampo(e: PayrollEntry, campo: keyof PayrollEntry, valor: number) {
    const res = await fetch(`/api/costos/payroll/${e.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [campo]: valor }),
    });
    if (res.ok) { const { entry } = await res.json(); setItems((xs) => xs.map((x) => (x.id === e.id ? entry : x))); }
  }

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

  const roles = [...new Set(items.map((e) => e.rol).filter(Boolean))].sort();
  const periodos = [...new Set(items.map((e) => e.periodo).filter(Boolean))].sort();
  const visibles = items.filter((e) =>
    (!verRol || e.rol === verRol) &&
    (!verPeriodo || e.periodo === verPeriodo) &&
    (!verPagado || (verPagado === "si" ? e.pagado : !e.pagado)),
  );
  const total = visibles.reduce((a, e) => a + e.monto, 0);
  const pagado = visibles.filter((e) => e.pagado).reduce((a, e) => a + e.monto, 0);

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-3 mb-5">
        <Stat label="Total nómina" val={money(total)} />
        <Stat label="Pagado" val={money(pagado)} />
        <Stat label="Por pagar" val={money(total - pagado)} />
      </div>

      {/* Generar la quincena para los participantes del proyecto */}
      <div className={`${CARD} p-4 mb-4 flex flex-wrap items-end gap-3`}>
        <label className="text-xs text-[#7A7A7A] flex flex-col gap-1">Quincena (por fecha)
          <input type="date" value={genFecha} onChange={(e) => setGenFecha(e.target.value)} className={INPUT + " w-44"} />
        </label>
        <span className="text-xs text-[#7A7A7A] pb-2">→ {quincenaDe(genFecha).periodo} · {quincenaDe(genFecha).diasQuincena} días · {participantes.length} participante(s)</span>
        <button onClick={generarQuincena} disabled={busy} className={BTN_PRIMARY}><Users size={14} /> Generar quincena</button>
      </div>

      {/* Equivalencia jornada ↔ horas (referencia para capturar días) */}
      <div className={`${CARD} px-4 py-3 mb-4`}>
        <div className="flex items-center gap-2 mb-2">
          <Clock size={14} className="text-[#C9A84C]" />
          <span className="text-xs uppercase tracking-wider text-[#1B2A5E] font-semibold">Equivalencia de jornada</span>
          <span className="text-xs text-[#7A7A7A]">1 jornada = 8 horas. La columna «Días» se captura en jornadas (admite medios).</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {[["1", "jornada", "8 h"], ["0.75", "¾ jornada", "6 h"], ["0.5", "½ jornada", "4 h"], ["0.25", "¼ jornada", "2 h"]].map(([d, j, h]) => (
            <span key={d} className="inline-flex items-center gap-1.5 bg-[#F5F2EC] border border-[#EDE9E0] px-2.5 py-1 text-xs">
              <span className="data-label text-[#1B2A5E] font-semibold">{d}</span>
              <span className="text-[#7A7A7A]">{j} = {h}</span>
            </span>
          ))}
        </div>
      </div>

      <div className={`${CARD} p-4 mb-4 flex flex-wrap items-end gap-2`}>
        <input placeholder="Persona" value={f.persona} onChange={(e) => setF({ ...f, persona: e.target.value })} className={INPUT + " flex-1 min-w-[160px]"} />
        {catalog.salarios.length > 0 && (
          <select defaultValue="" onChange={(e) => { pickRol(e.target.value); e.target.value = ""; }} className={INPUT + " w-44"} title="Traer del catálogo de salarios">
            <option value="">Del catálogo…</option>
            {catalog.salarios.map((s) => <option key={s.id} value={s.id}>{s.rol} · {money(s.jornada)}</option>)}
          </select>
        )}
        <input placeholder="Rol" value={f.rol} onChange={(e) => setF({ ...f, rol: e.target.value })} className={INPUT + " w-40"} />
        <input placeholder="Periodo" value={f.periodo} onChange={(e) => setF({ ...f, periodo: e.target.value })} className={INPUT + " w-32"} />
        <input type="number" placeholder="Monto" value={f.monto} onChange={(e) => setF({ ...f, monto: e.target.value })} className={INPUT + " w-32"} />
        <button onClick={crear} disabled={busy} className={BTN_PRIMARY}><Plus size={14} /> Agregar</button>
      </div>
      {items.length > 0 && (
        <div className={`${CARD} px-3 py-2.5 mb-3 flex flex-wrap items-center gap-2`}>
          {roles.length > 0 && (
            <select value={verRol} onChange={(e) => setVerRol(e.target.value)} className={INPUT + " w-auto"} title="Filtrar por rol">
              <option value="">Todos los roles</option>
              {roles.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          )}
          {periodos.length > 0 && (
            <select value={verPeriodo} onChange={(e) => setVerPeriodo(e.target.value)} className={INPUT + " w-auto"} title="Filtrar por periodo">
              <option value="">Todos los periodos</option>
              {periodos.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          )}
          <span className="flex items-center gap-2">
            {([["", "Todos"], ["si", "Pagado"], ["no", "Por pagar"]] as const).map(([id, label]) => {
              const on = verPagado === id;
              return (
                <button key={id || "todos"} onClick={() => setVerPagado(id)}
                  className={`px-3 py-1.5 text-xs tracking-wider uppercase font-semibold border transition-colors ${on ? "bg-[#1B2A5E] text-[#F5F2EC] border-[#1B2A5E]" : "border-[#EDE9E0] text-[#7A7A7A] hover:border-[#C9A84C]"}`}>
                  {label}
                </button>
              );
            })}
          </span>
          <span className="text-xs text-[#7A7A7A] ml-auto">{visibles.length} de {items.length}</span>
        </div>
      )}
      <div className={`${CARD} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[#7A7A7A] text-xs uppercase tracking-wider border-b border-[#EDE9E0]">
              <th className="px-3 py-3 font-semibold">Persona</th>
              <th className="px-3 py-3 font-semibold">Rol</th>
              <th className="px-3 py-3 font-semibold">Periodo</th>
              <th className="px-3 py-3 font-semibold text-right">Diaria</th>
              <th className="px-3 py-3 font-semibold text-right" title="En jornadas (1 = 8 h)">Días</th>
              <th className="px-3 py-3 font-semibold text-right">Descuento</th>
              <th className="px-3 py-3 font-semibold text-right">Monto</th>
              <th className="px-3 py-3 font-semibold text-center">Pagado</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {visibles.map((e) => {
              const quincenal = e.diaria != null;
              return (
              <tr key={e.id} className="border-b border-[#F5F2EC]">
                <td className="px-3 py-2 text-[#2C2C2C]">{e.persona}</td>
                <td className="px-3 py-2 text-[#7A7A7A]">{e.rol || "—"}</td>
                <td className="px-3 py-2 text-[#7A7A7A] data-label">{e.periodo || "—"}</td>
                <td className="px-3 py-2 text-right data-label">
                  {quincenal ? (
                    <input key={`d-${e.id}-${e.diaria}`} type="number" step="0.01" defaultValue={e.diaria}
                      onBlur={(ev) => { const v = Number(ev.target.value) || 0; if (v !== e.diaria) patchCampo(e, "diaria", v); }}
                      className="w-20 border border-[#EDE9E0] px-2 py-1 text-right focus:outline-none focus:border-[#C9A84C]" />
                  ) : <span className="text-[#C0BDB8]">—</span>}
                </td>
                <td className="px-3 py-2 text-right data-label whitespace-nowrap">
                  {quincenal ? (
                    <span className="inline-flex items-center gap-1">
                      <input key={`dt-${e.id}-${e.diasTrabajados}`} type="number" step="0.5" min="0" defaultValue={e.diasTrabajados ?? e.diasQuincena ?? 0}
                        onBlur={(ev) => { const v = Number(ev.target.value) || 0; if (v !== (e.diasTrabajados ?? e.diasQuincena)) patchCampo(e, "diasTrabajados", v); }}
                        className="w-14 border border-[#EDE9E0] px-2 py-1 text-right focus:outline-none focus:border-[#C9A84C]" title={`Días trabajados en jornadas (1 = 8 h). ${(e.diasTrabajados ?? e.diasQuincena ?? 0)} jor = ${(e.diasTrabajados ?? e.diasQuincena ?? 0) * 8} h`} />
                      <span className="text-[#7A7A7A] text-xs">/{e.diasQuincena ?? "—"}</span>
                    </span>
                  ) : <span className="text-[#C0BDB8]">—</span>}
                </td>
                <td className="px-3 py-2 text-right data-label">
                  {quincenal ? (
                    <input key={`ds-${e.id}-${e.descuento}`} type="number" step="0.01" min="0" defaultValue={e.descuento ?? 0}
                      onBlur={(ev) => { const v = Number(ev.target.value) || 0; if (v !== (e.descuento ?? 0)) patchCampo(e, "descuento", v); }}
                      className="w-20 border border-[#EDE9E0] px-2 py-1 text-right focus:outline-none focus:border-[#C9A84C]" />
                  ) : <span className="text-[#C0BDB8]">—</span>}
                </td>
                <td className="px-3 py-2 text-right data-label font-medium text-[#1B2A5E]">{money(e.monto)}</td>
                <td className="px-3 py-2 text-center">
                  <button onClick={() => togglePagado(e)} className={`text-xs px-2 py-0.5 border ${e.pagado ? "bg-green-50 text-green-700 border-green-200" : "bg-[#F5F2EC] text-[#7A7A7A] border-[#EDE9E0]"}`}>{e.pagado ? "Sí" : "No"}</button>
                </td>
                <td className="px-3 py-2 text-right"><button onClick={() => borrar(e.id)} className="text-[#7A7A7A] hover:text-red-500"><Trash2 size={14} /></button></td>
              </tr>
              );
            })}
            {visibles.length === 0 && <tr><td colSpan={9} className="px-3 py-8 text-center text-[#7A7A7A]">{items.length === 0 ? "Sin pagos registrados." : "Sin resultados para el filtro."}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
