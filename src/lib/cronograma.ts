import type { Budget } from "@/lib/db";

/** Días de la semana en orden laboral (lunes→domingo). getDay(): 0=Dom … 6=Sáb. */
export const DIAS_SEMANA: { d: number; label: string }[] = [
  { d: 1, label: "L" }, { d: 2, label: "M" }, { d: 3, label: "M" },
  { d: 4, label: "J" }, { d: 5, label: "V" }, { d: 6, label: "S" }, { d: 0, label: "D" },
];

/** Offsets de inicio acumulados (en días laborables) para una lista de duraciones. */
export function offsetsAcumulados(durs: number[]): number[] {
  const out: number[] = [];
  let s = 0;
  for (const d of durs) { out.push(s); s += d; }
  return out;
}

/** Fecha del n-ésimo día laborable (0 = primer laborable en/después de `start`),
 *  saltando los días marcados como descanso. */
export function diaLaborable(start: Date, descanso: Set<number>, n: number): Date {
  const d = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  while (descanso.has(d.getDay())) d.setDate(d.getDate() + 1);
  let hechos = 0;
  while (hechos < n) {
    d.setDate(d.getDate() + 1);
    if (!descanso.has(d.getDay())) hechos += 1;
  }
  return d;
}

export const fmtDia = (d: Date) =>
  d.toLocaleDateString("es-MX", { day: "2-digit", month: "short" });

export interface GanttFila {
  concepto: string;
  jornales: number;
  /** Personas en paralelo usadas como divisor para este concepto. */
  personas: number;
  dur: number;
  ini: Date;
  fin: Date;
  left: number;
  width: number;
}
export interface Cronograma {
  personas: number;
  inicioStr: string;
  diasLaborSem: number;
  descanso: number[];
  totalJornales: number;
  totalDias: number;
  fechaFin: Date;
  filas: GanttFila[];
}

/**
 * Calcula el cronograma de un presupuesto: duración de cada concepto en días
 * laborables (jornales ÷ cuadrilla), repartidos desde la fecha de inicio y
 * saltando los días de descanso. Fuente única usada por la vista de admin y la
 * de empleado (solo lectura).
 */
export function computeCronograma(budget: Budget, override?: { personas?: number; inicioStr?: string; descanso?: number[] }): Cronograma {
  const personas = Math.max(1, override?.personas ?? budget.personas ?? 2);
  const inicioStr = override?.inicioStr || budget.cronoInicio || new Date().toISOString().slice(0, 10);
  const descansoArr = override?.descanso ?? budget.cronoDescanso ?? [0];
  const restSet = new Set(descansoArr.length >= 7 ? [] : descansoArr);
  const diasLaborSem = Math.max(1, 7 - restSet.size);
  const inicio = new Date(inicioStr + "T00:00:00");

  // Divisor por concepto si lo trae la línea (personas en paralelo de su
  // cuadrilla); si no, la cuadrilla general del presupuesto.
  const divisor = (l: (typeof budget.lineas)[number]) => Math.max(1, l.cuadrillaPersonas ?? personas);
  const durs = budget.lineas.map((l) => ((l.tiempoPU ?? 0) * l.cantidad) / divisor(l));
  const starts = offsetsAcumulados(durs);
  const totalDias = durs.reduce((a, d) => a + d, 0);
  const totalJornales = budget.lineas.reduce((a, l) => a + (l.tiempoPU ?? 0) * l.cantidad, 0);
  const fechaFin = totalDias > 0 ? diaLaborable(inicio, restSet, Math.max(0, Math.ceil(totalDias) - 1)) : inicio;

  const filas: GanttFila[] = budget.lineas.map((l, i) => {
    const dur = durs[i];
    const so = starts[i];
    return {
      concepto: l.concepto || l.descripcion || "",
      jornales: (l.tiempoPU ?? 0) * l.cantidad,
      personas: divisor(l),
      dur,
      ini: diaLaborable(inicio, restSet, Math.floor(so)),
      fin: diaLaborable(inicio, restSet, Math.max(Math.floor(so), Math.ceil(so + dur) - 1)),
      left: totalDias > 0 ? (so / totalDias) * 100 : 0,
      width: totalDias > 0 ? Math.max(1.5, (dur / totalDias) * 100) : 0,
    };
  });

  return { personas, inicioStr, diasLaborSem, descanso: descansoArr, totalJornales, totalDias, fechaFin, filas };
}
