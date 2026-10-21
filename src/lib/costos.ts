import "server-only";
import type {
  BudgetLine,
  ConceptInput,
  CostInputKind,
  RecipeComponent,
} from "@/lib/db";

/**
 * Normalizadores de payloads del módulo de costos. Viven aquí (no en los route
 * handlers) porque Next solo permite exportar los métodos HTTP desde un
 * `route.ts`; compartir helpers entre rutas se hace desde `lib/`.
 */

const KINDS: CostInputKind[] = [
  "material",
  "herramienta",
  "equipo",
  "mano_obra",
  "receta",
];

/** Normaliza los insumos de un concepto recibidos del cliente. */
export function cleanInputs(raw: unknown): ConceptInput[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((i): ConceptInput => {
    const o = (i ?? {}) as Partial<ConceptInput>;
    return {
      kind: KINDS.includes(o.kind as CostInputKind)
        ? (o.kind as CostInputKind)
        : "material",
      refId: o.refId ?? null,
      nombre: (o.nombre || "").trim(),
      unidad: (o.unidad || "").trim(),
      precio: Number(o.precio) || 0,
      cantidad: Number(o.cantidad) || 0,
    };
  });
}

/** Normaliza los componentes de una receta recibidos del cliente. */
export function cleanComponents(raw: unknown): RecipeComponent[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((c): RecipeComponent => {
    const o = (c ?? {}) as Partial<RecipeComponent>;
    return {
      materialId: o.materialId ?? null,
      recipeId: o.recipeId ?? null,
      nombre: (o.nombre || "").trim(),
      unidad: (o.unidad || "").trim(),
      precio: Number(o.precio) || 0,
      cantidad: Number(o.cantidad) || 0,
    };
  });
}

/** Normaliza las líneas de un presupuesto recibidas del cliente. */
export function cleanBudgetLines(raw: unknown): BudgetLine[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((l): BudgetLine => {
    const o = (l ?? {}) as Partial<BudgetLine>;
    return {
      conceptId: o.conceptId ?? null,
      clave: (o.clave || "").trim(),
      concepto: (o.concepto || "").trim(),
      descripcion: (o.descripcion || "").trim(),
      unidad: (o.unidad || "").trim(),
      pu: Number(o.pu) || 0,
      cantidad: Number(o.cantidad) || 0,
      tiempoPU: o.tiempoPU != null ? Number(o.tiempoPU) : null,
    };
  });
}
