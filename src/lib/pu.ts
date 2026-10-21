/**
 * Motor de Precios Unitarios (P.U.).
 *
 * Traduce a código las fórmulas del Excel de presupuestos. Funciones PURAS (sin
 * acceso a disco ni sesión) para poder usarlas igual en el servidor, en el
 * importador y en pruebas.
 *
 * Cadena de cálculo:
 *   insumo = precio_unitario × cantidad(rendimiento)
 *   costo directo (CD) = Σ insumos
 *   P.U. = CD × (1 + indirectos) × (1 + utilidad)
 *
 * (Verificado contra el Excel: CD 283.19 × 1.25 × 1.30 = 460.18.)
 */

import type {
  Concept,
  ConceptInput,
  CostInputKind,
  CostMaterial,
  LaborRate,
  Recipe,
  RecipeComponent,
  Budget,
  BudgetLine,
} from "@/lib/db";

/** Redondeo a 2 decimales para montos en pantalla (no para encadenar cálculos). */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Catálogos indexados por id, para resolver precios en vivo. */
export interface CostCatalogs {
  materials: Map<string, CostMaterial>;
  recipes: Map<string, Recipe>;
  labor: Map<string, LaborRate>;
}

/** Construye los índices a partir de los arrays de la base de datos. */
export function buildCatalogs(src: {
  costMaterials: CostMaterial[];
  recipes: Recipe[];
  laborRates: LaborRate[];
}): CostCatalogs {
  return {
    materials: new Map(src.costMaterials.map((m) => [m.id, m])),
    recipes: new Map(src.recipes.map((r) => [r.id, r])),
    labor: new Map(src.laborRates.map((l) => [l.id, l])),
  };
}

/**
 * Costo de una receta = Σ (precio × cantidad) de sus componentes. Resuelve el
 * precio en vivo desde el catálogo cuando hay referencia; si no, usa el
 * snapshot guardado. Soporta recetas anidadas con control de ciclos.
 */
export function recipeCost(
  recipe: Recipe,
  catalogs: CostCatalogs,
  seen: Set<string> = new Set(),
): number {
  if (seen.has(recipe.id)) return 0; // evita recursión infinita
  seen.add(recipe.id);
  let total = 0;
  for (const c of recipe.componentes) {
    total += componentUnitPrice(c, catalogs, seen) * c.cantidad;
  }
  return total;
}

/** Precio unitario efectivo de un componente de receta (vivo o snapshot). */
function componentUnitPrice(
  c: RecipeComponent,
  catalogs: CostCatalogs,
  seen: Set<string>,
): number {
  if (c.recipeId) {
    const r = catalogs.recipes.get(c.recipeId);
    if (r) return recipeCost(r, catalogs, seen);
  }
  if (c.materialId) {
    const m = catalogs.materials.get(c.materialId);
    if (m) return m.precio;
  }
  return c.precio; // externo / sin referencia
}

/** Precio unitario efectivo de un insumo de concepto, resuelto en vivo. */
export function inputUnitPrice(i: ConceptInput, catalogs: CostCatalogs): number {
  switch (i.kind) {
    case "material":
    case "herramienta":
    case "equipo": {
      const m = i.refId ? catalogs.materials.get(i.refId) : undefined;
      return m ? m.precio : i.precio;
    }
    case "receta": {
      const r = i.refId ? catalogs.recipes.get(i.refId) : undefined;
      return r ? recipeCost(r, catalogs) : i.precio;
    }
    case "mano_obra": {
      // El precio guardado es la tarifa por unidad de tiempo (jornada/hora);
      // la "cantidad" del insumo es cuántas de esas unidades consume la obra.
      const l = i.refId ? catalogs.labor.get(i.refId) : undefined;
      return l ? l.jornada : i.precio;
    }
    default:
      return i.precio;
  }
}

/** Importe de un renglón de insumo = precio × cantidad. */
export function inputAmount(i: ConceptInput, catalogs: CostCatalogs): number {
  return inputUnitPrice(i, catalogs) * i.cantidad;
}

export interface ConceptBreakdown {
  /** Subtotales por tipo de insumo. */
  porTipo: Record<CostInputKind, number>;
  costoDirecto: number;
  indirectos: number;
  utilidad: number;
  /** CD × (1 + indirectos). */
  subtotal: number;
  pu: number;
}

/**
 * Desglose completo de un concepto: subtotales por tipo, costo directo,
 * indirectos, utilidad y P.U. final.
 */
export function conceptBreakdown(
  concept: Concept,
  catalogs: CostCatalogs,
): ConceptBreakdown {
  const porTipo: Record<CostInputKind, number> = {
    material: 0,
    herramienta: 0,
    equipo: 0,
    mano_obra: 0,
    receta: 0,
  };
  for (const i of concept.insumos) {
    porTipo[i.kind] += inputAmount(i, catalogs);
  }
  const costoDirecto =
    porTipo.material +
    porTipo.herramienta +
    porTipo.equipo +
    porTipo.mano_obra +
    porTipo.receta;
  const indirectos = costoDirecto * concept.factorIndirectos;
  const subtotal = costoDirecto + indirectos;
  const utilidad = subtotal * concept.factorUtilidad;
  const pu = subtotal + utilidad;
  return { porTipo, costoDirecto, indirectos, utilidad, subtotal, pu };
}

/** Costo directo de un concepto. */
export function conceptCostoDirecto(
  concept: Concept,
  catalogs: CostCatalogs,
): number {
  return conceptBreakdown(concept, catalogs).costoDirecto;
}

/** P.U. de un concepto, recalculado en vivo desde los catálogos. */
export function conceptPU(concept: Concept, catalogs: CostCatalogs): number {
  return conceptBreakdown(concept, catalogs).pu;
}

/**
 * Recalcula y fija los campos cache (`costoDirecto`, `pu`) de un concepto.
 * Devuelve el mismo objeto mutado (útil dentro de `mutate`).
 */
export function recomputeConcept(
  concept: Concept,
  catalogs: CostCatalogs,
): Concept {
  const b = conceptBreakdown(concept, catalogs);
  concept.costoDirecto = b.costoDirecto;
  concept.pu = b.pu;
  return concept;
}

export interface BudgetTotals {
  subtotal: number;
  iva: number;
  total: number;
  /** Jornadas totales (Σ tiempoPU × cantidad). */
  jornadas: number;
  lineas: Array<{ importe: number }>;
}

/**
 * Totales de un presupuesto (hoja `COTIZACIÓN`): subtotal, IVA y total, más las
 * jornadas del cronograma. Usa el P.U. congelado en cada línea.
 */
export function budgetTotals(budget: Budget): BudgetTotals {
  const lineas = budget.lineas.map((l: BudgetLine) => ({
    importe: l.pu * l.cantidad,
  }));
  const subtotal = lineas.reduce((a, l) => a + l.importe, 0);
  const iva = subtotal * budget.factorIva;
  const jornadas = budget.lineas.reduce(
    (a, l) => a + (l.tiempoPU ?? 0) * l.cantidad,
    0,
  );
  return { subtotal, iva, total: subtotal + iva, jornadas, lineas };
}
