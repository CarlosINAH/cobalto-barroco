import type { Budget } from "@/lib/db";
import { computeCronograma, fmtDia, diaLaborable } from "@/lib/cronograma";

const CARD = "bg-white border border-[#EDE9E0]";

function Stat({ label, val }: { label: string; val: string }) {
  return (
    <div className={`${CARD} p-3`}>
      <p className="text-[#1B2A5E] text-lg data-label" style={{ fontFamily: "var(--font-playfair)" }}>{val}</p>
      <p className="text-[#7A7A7A] text-[11px] uppercase tracking-wider mt-0.5">{label}</p>
    </div>
  );
}

/** Cronograma (Gantt) de solo lectura para un presupuesto. */
export default function GanttReadOnly({ budget }: { budget: Budget | null }) {
  if (!budget || budget.lineas.length === 0)
    return <div className={`${CARD} py-10 px-6 text-center text-sm text-[#7A7A7A]`}>Aún no hay cronograma para este proyecto.</div>;

  const c = computeCronograma(budget);
  const restSet = new Set(c.descanso.length >= 7 ? [] : c.descanso);
  const inicio = diaLaborable(new Date(c.inicioStr + "T00:00:00"), restSet, 0);

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-4 mb-4">
        <Stat label="Jornales" val={c.totalJornales.toFixed(2)} />
        <Stat label="Días laborables" val={c.totalDias.toFixed(1)} />
        <Stat label="Cuadrilla" val={String(c.personas)} />
        <Stat label="Entrega" val={fmtDia(c.fechaFin)} />
      </div>
      <div className={`${CARD} p-4`}>
        <div className="flex items-center justify-between text-xs text-[#7A7A7A] mb-3 data-label">
          <span>Inicio · {fmtDia(inicio)}</span>
          <span>Entrega · {fmtDia(c.fechaFin)}</span>
        </div>
        <div className="space-y-1.5">
          {c.filas.map((f, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-44 shrink-0 min-w-0">
                <p className="truncate text-xs text-[#2C2C2C]" title={f.concepto}>{f.concepto}</p>
                {f.cuadrilla && f.cuadrilla.length > 0 && (
                  <p className="truncate text-[10px] text-[#7A7A7A]" title={f.cuadrilla.map((r) => `${r.rol}: ${r.jornadas} jor`).join(" · ")}>
                    {f.cuadrilla.map((r) => `${r.rol} (${r.jornadas} jor)`).join(" · ")}
                  </p>
                )}
              </div>
              <div className="flex-1 relative h-6 bg-[#F5F2EC]">
                <div className="absolute top-0 h-6 bg-[#C9A84C]" style={{ left: `${f.left}%`, width: `${f.width}%` }}
                  title={`${f.jornales.toFixed(2)} jornales · cuadrilla ${f.personas} · ${fmtDia(f.ini)} – ${fmtDia(f.fin)}`} />
              </div>
              <div className="w-36 shrink-0 text-right text-[11px] text-[#7A7A7A] data-label">{fmtDia(f.ini)} – {fmtDia(f.fin)}</div>
            </div>
          ))}
        </div>
      </div>
      <p className="text-xs text-[#7A7A7A] mt-2">Fechas calculadas a partir de la fecha de inicio, la cuadrilla y los días de descanso del proyecto.</p>
    </div>
  );
}
