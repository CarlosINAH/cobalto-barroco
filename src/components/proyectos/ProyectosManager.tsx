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
} from "lucide-react";
import type { Project, Budget } from "@/lib/db";

/** Sub-pestañas de un proyecto = las hojas del Excel, convertidas en módulos. */
type SubTab = "presupuesto" | "cotizacion" | "cronograma" | "administracion" | "nomina";

const SUBTABS: {
  id: SubTab;
  label: string;
  icon: React.ElementType;
  hoja: string;
  desc: string;
}[] = [
  { id: "presupuesto", label: "Presupuesto", icon: Calculator, hoja: "P.U. / Matrices", desc: "Arma el catálogo de conceptos del proyecto con sus matrices de P.U. (material, herramienta, equipo y mano de obra) tomando precios de los catálogos globales." },
  { id: "cotizacion", label: "Cotización", icon: FileText, hoja: "COTIZACIÓN / DGPU", desc: "Genera la cotización al cliente: P.U. × cantidad, subtotal, IVA 16% y total, lista para exportar a PDF." },
  { id: "cronograma", label: "Cronograma", icon: CalendarRange, hoja: "CRONO", desc: "Calcula jornadas (tiempo × cantidad) y las distribuye por semanas." },
  { id: "administracion", label: "Administración", icon: Wallet, hoja: "ADMINISTRACIÓN", desc: "Registra anticipo, finiquito, egresos y utilidad del proyecto: lo real contra lo presupuestado." },
  { id: "nomina", label: "Nómina", icon: Users, hoja: "NÓMINA", desc: "Nómina del proyecto por persona y periodo, ligada a la cuadrilla asignada." },
];

const CARD = "bg-white border border-[#EDE9E0]";
const ESTADO: Record<Project["estado"], { label: string; cls: string }> = {
  activo: { label: "Activo", cls: "bg-green-50 text-green-700 border-green-200" },
  finalizado: { label: "Finalizado", cls: "bg-[#F5F2EC] text-[#7A7A7A] border-[#EDE9E0]" },
  futuro: { label: "Futuro", cls: "bg-[#1B2A5E]/5 text-[#1B2A5E] border-[#1B2A5E]/20" },
};

export default function ProyectosManager({
  proyectos,
  budgets,
  totalConceptos,
}: {
  proyectos: Project[];
  budgets: Budget[];
  totalConceptos: number;
}) {
  const [selId, setSelId] = useState<string | null>(null);
  const sel = proyectos.find((p) => p.id === selId) || null;

  if (sel) {
    return (
      <ProyectoDetalle
        proyecto={sel}
        budget={budgets.find((b) => b.projectId === sel.id) || null}
        onBack={() => setSelId(null)}
      />
    );
  }

  return (
    <div>
      <p className="text-sm text-[#7A7A7A] mb-5">
        Elige un proyecto para analizar, cotizar o editar. Los precios salen de los{" "}
        <Link href="/dashboard/admin/costos" className="text-[#1B2A5E] underline hover:text-[#C9A84C]">catálogos de costos</Link>
        {" "}({totalConceptos} conceptos en catálogo).
      </p>

      {proyectos.length === 0 ? (
        <div className={`${CARD} py-16 px-6 text-center text-sm text-[#7A7A7A]`}>
          No hay proyectos todavía. Crea uno en{" "}
          <Link href="/dashboard/admin/personal" className="text-[#1B2A5E] underline hover:text-[#C9A84C]">Personal y permisos</Link>{" "}
          o desde la gestión de proyectos, y aparecerá aquí para presupuestar.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {proyectos.map((p) => {
            const est = ESTADO[p.estado] ?? ESTADO.activo;
            return (
              <button
                key={p.id}
                onClick={() => setSelId(p.id)}
                className={`${CARD} p-5 text-left hover:border-[#C9A84C]/60 transition-colors group`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs px-2 py-0.5 border ${est.cls}`}>{est.label}</span>
                  <ArrowRight size={14} className="text-[#EDE9E0] group-hover:text-[#C9A84C]" />
                </div>
                <h3 className="text-[#1B2A5E] text-lg leading-tight" style={{ fontFamily: "var(--font-playfair)" }}>{p.nombre}</h3>
                {p.ubicacion && (
                  <p className="flex items-center gap-1 text-xs text-[#7A7A7A] mt-1"><MapPin size={12} /> {p.ubicacion}</p>
                )}
                <div className="mt-4 h-1.5 bg-[#F5F2EC] overflow-hidden">
                  <div className="h-full bg-[#C9A84C]" style={{ width: `${Math.min(100, Math.max(0, p.avance))}%` }} />
                </div>
                <p className="text-xs text-[#7A7A7A] mt-1 data-label">{p.avance}% avance</p>
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
  budget,
  onBack,
}: {
  proyecto: Project;
  budget: Budget | null;
  onBack: () => void;
}) {
  const [tab, setTab] = useState<SubTab>("presupuesto");
  const est = ESTADO[proyecto.estado] ?? ESTADO.activo;
  const active = SUBTABS.find((s) => s.id === tab)!;

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-[#7A7A7A] hover:text-[#1B2A5E] mb-4">
        <ChevronLeft size={16} /> Todos los proyectos
      </button>

      <div className={`${CARD} p-5 mb-5`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-[#1B2A5E] text-2xl" style={{ fontFamily: "var(--font-playfair)" }}>{proyecto.nombre}</h2>
            {proyecto.ubicacion && <p className="flex items-center gap-1 text-sm text-[#7A7A7A] mt-1"><MapPin size={13} /> {proyecto.ubicacion}</p>}
          </div>
          <span className={`text-xs px-2 py-1 border ${est.cls}`}>{est.label}</span>
        </div>
      </div>

      {/* Sub-pestañas = hojas del Excel */}
      <div className="flex gap-1 border-b border-[#EDE9E0] mb-6 overflow-x-auto">
        {SUBTABS.map((s) => {
          const Icon = s.icon;
          const on = tab === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setTab(s.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs tracking-wider uppercase font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors ${
                on ? "border-[#C9A84C] text-[#1B2A5E]" : "border-transparent text-[#7A7A7A] hover:text-[#1B2A5E]"
              }`}
            >
              <Icon size={14} /> {s.label}
            </button>
          );
        })}
      </div>

      {/* Contenido de la sub-pestaña: andamiaje de Fase 3 */}
      <div className={`${CARD} p-8`}>
        <div className="flex items-center gap-2 text-[#C9A84C] mb-2">
          <active.icon size={18} />
          <span className="data-label text-xs uppercase tracking-widest">Hoja: {active.hoja}</span>
        </div>
        <h3 className="text-[#1B2A5E] text-xl mb-2" style={{ fontFamily: "var(--font-playfair)" }}>{active.label}</h3>
        <p className="text-sm text-[#2C2C2C] max-w-2xl">{active.desc}</p>
        <div className="mt-6 flex items-center gap-2 text-sm text-[#7A7A7A] bg-[#F5F2EC] border border-[#EDE9E0] px-4 py-3">
          <Construction size={16} className="text-[#C9A84C] shrink-0" />
          Módulo en construcción (Fase 3). La fundación de datos y el motor de cálculo ya están listos
          {budget ? "; este proyecto ya tiene un presupuesto guardado." : "."}
        </div>
      </div>
    </div>
  );
}
