import "server-only";
import type {
  BudgetLine,
  ConceptInput,
  CostInputKind,
  CuadrillaRol,
  ProrrateoItem,
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
      depreciacion:
        o.depreciacion == null || !Number.isFinite(Number(o.depreciacion))
          ? undefined
          : Math.min(1, Math.max(0, Number(o.depreciacion))),
    };
  });
}

/** Normaliza el comprobante (factura/nota) de un movimiento. */
export function cleanComprobante(raw: unknown): { path: string; nombre: string } | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as { path?: unknown; nombre?: unknown };
  const path = typeof o.path === "string" ? o.path.trim() : "";
  if (!path) return undefined;
  const nombre = typeof o.nombre === "string" && o.nombre.trim() ? o.nombre.trim() : path.split("/").pop() || path;
  return { path, nombre };
}

/** Normaliza los prorrateos de un presupuesto. */
export function cleanProrrateos(raw: unknown): ProrrateoItem[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out = raw
    .map((p, i): ProrrateoItem => {
      const o = (p ?? {}) as Partial<ProrrateoItem>;
      const reparto = Array.isArray(o.reparto)
        ? o.reparto
            .map((r) => ({
              lineKey: String((r as { lineKey?: unknown }).lineKey ?? "").trim(),
              porcentaje: Math.max(0, Math.min(100, Number((r as { porcentaje?: unknown }).porcentaje) || 0)),
            }))
            .filter((r) => r.lineKey)
        : [];
      return {
        id: (o.id || `PRO-${i + 1}`).trim(),
        nombre: (o.nombre || "").trim(),
        monto: Number(o.monto) || 0,
        reparto,
      };
    })
    .filter((p) => p.nombre || p.monto || p.reparto.length);
  return out.length ? out : undefined;
}

/** Normaliza la cuadrilla de un concepto (rol × personas × jornadas). */
export function cleanCuadrilla(raw: unknown): CuadrillaRol[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out = raw
    .map((c): CuadrillaRol => {
      const o = (c ?? {}) as Partial<CuadrillaRol>;
      return {
        rol: (o.rol || "").trim(),
        personas: Math.max(0, Number(o.personas) || 0),
        jornadas: Math.max(0, Number(o.jornadas) || 0),
      };
    })
    .filter((c) => c.rol);
  return out.length ? out : undefined;
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
      cuadrillaPersonas:
        o.cuadrillaPersonas != null ? Math.max(1, Number(o.cuadrillaPersonas) || 1) : undefined,
      cuadrilla: cleanCuadrilla(o.cuadrilla),
    };
  });
}
