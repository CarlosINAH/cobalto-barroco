import "server-only";
import type { CostMaterial } from "./db";

/**
 * Normalización del catálogo de materiales (revisión de consistencia).
 *
 * Qué hace, de forma determinista y reversible (se puede previsualizar antes de
 * aplicar):
 *  1. Convierte las "familias partidas" (p. ej. LIMPIEZA GRUESA/FINA/GENERAL) en
 *     categoría madre + subcategoría, usando el campo `subcategoria`.
 *  2. Arregla categorías rotas por corrimiento del Excel (el nombre de un
 *     producto quedó como categoría).
 *  3. Reparte el cajón "Solventes" en SOLVENTES vs REACTIVOS.
 *  4. Corrige tipeos (DESBATE→DESBASTE) y unifica MADERA/MADERAS.
 *  5. Marca (sin borrar) posibles duplicados con una nota para que el admin
 *     decida cuál conservar.
 *  6. Quita las filas basura (encabezados con precio 0: JABONES, REACTIVOS,
 *     ÚLTIMO).
 *
 * No borra ningún producto real ni cambia precios; solo reclasifica y anota.
 */

type Par = [categoria: string, subcategoria: string];

/** Familias partidas → [categoría madre, subcategoría]. */
const REMAP: Record<string, Par> = {
  // LIMPIEZA
  "LIMPIEZA GRUESA": ["LIMPIEZA", "GRUESA"],
  "LIMPIEZA FINA": ["LIMPIEZA", "FINA"],
  "LIMPIEZA GENERAL": ["LIMPIEZA", "GENERAL"],
  "LIMPIEZA ABRASIÓN": ["LIMPIEZA", "ABRASIÓN"],
  LIMPIEZA: ["LIMPIEZA", ""],
  // RESANE
  "RESANE GRUESO": ["RESANE", "GRUESO"],
  "RESANE FINO": ["RESANE", "FINO"],
  "RESANE ORGÁNICO": ["RESANE", "ORGÁNICO"],
  "RESANE INORGÁNICO": ["RESANE", "INORGÁNICO"],
  // ADHESIVOS
  "ADHESIVOS ORGÁNICO": ["ADHESIVOS", "ORGÁNICO"],
  "ADHESIVOS INORGÁNICO": ["ADHESIVOS", "INORGÁNICO"],
  // CONSOLIDACIÓN
  "CONSOLIDACIÓN ORGÁNICO": ["CONSOLIDACIÓN", "ORGÁNICO"],
  "CONSOLIDACIÓN INORGÁNICO": ["CONSOLIDACIÓN", "INORGÁNICO"],
  // CAPA DE PROTECCIÓN
  "CAPA DE PROTECCIÓN ORGÁNICO": ["CAPA DE PROTECCIÓN", "ORGÁNICO"],
  "CAPA DE PROTECCIÓN INORGÁNICO": ["CAPA DE PROTECCIÓN", "INORGÁNICO"],
  // REINTEGRACIÓN
  "REINTEGRACIÓN P. BARNIZ": ["REINTEGRACIÓN", "P. BARNIZ"],
  "REINTEGRACIÓN PINTURAS": ["REINTEGRACIÓN", "PINTURAS"],
  "REINTEGRACIÓN DORADOS": ["REINTEGRACIÓN", "DORADOS"],
  "REINTEGRACIÓN PIGMENTOS": ["REINTEGRACIÓN", "PIGMENTOS"],
  "REINTEGRACIÓN EXTERIORES": ["REINTEGRACIÓN", "EXTERIORES"],
  "REINTEGRACIÓN PINCELES/BROCHUELOS": ["REINTEGRACIÓN", "PINCELES"],
  "REINTEGRACIÓN/CAPA DE PROTECCIÓN": ["REINTEGRACIÓN", "APLICACIÓN"],
  // CORTE
  "CORTE/PERFORACIÓN": ["CORTE", "PERFORACIÓN"],
  // MADERA (unifica y corrige "balsa", que en realidad es triplay)
  MADERAS: ["MADERAS", ""],
  MADERA: ["MADERAS", ""],
  "MADERA balsa": ["MADERAS", "TABLEROS"],
  // SOPORTE
  "SOPORTE TEXTIL": ["SOPORTE", "TEXTIL"],
  // Tipeo
  DESBATE: ["DESBASTE", ""],
};

/** Categorías rotas (un nombre de producto quedó como categoría). */
const BROKEN: Record<string, Par> = {
  "BEVA GEL 1/4 gal 1 l": ["ADHESIVOS", "INORGÁNICO"],
  "COLA de caseína": ["ADHESIVOS", "ORGÁNICO"],
  "SECANTE cartulina 50 x 70 cm 340 gr": ["PAPEL", ""],
  "AGATA No. 21": ["DORADO", ""],
  "PESTAÑA dorador No. 89": ["DORADO", ""],
};

/** Overrides por id (correcciones puntuales). */
const ID_OVERRIDE: Record<string, Par> = {
  // CARTUCHO GAS butano: estaba como equipo sin categoría; es consumible y
  // duplica a MAT-0400 (CAPA DE PROTECCIÓN INORGÁNICO).
  "MAT-0016": ["CAPA DE PROTECCIÓN", "INORGÁNICO"],
};
const KIND_FIX: Record<string, CostMaterial["kind"]> = { "MAT-0016": "material" };

/** Dentro de "Solventes", estos ids son REACTIVOS, no solventes. */
const REACTIVO_IDS = new Set([
  "MAT-0438", // agua oxigenada
  "MAT-0456", // photo flo
  "MAT-0457", "MAT-0458", // tritón X-100
  "MAT-0461", // agar-agar
  "MAT-0462", // benzotriazol
  "MAT-0463", // carbonato de cobre
  "MAT-0464", // convertidor oxi-primer
  "MAT-0465", "MAT-0466", // EDTA
  "MAT-0467", "MAT-0468", "MAT-0469", // nitratos
  "MAT-0470", // peróxido
  "MAT-0471", "MAT-0472", // polvo de zinc
  "MAT-0473", // sulfato de cobre
  "MAT-0474", // sulfuro de amonio
  "MAT-0475", // sulfuro de potasio
  "MAT-0476", // tartrato de sodio
  "MAT-0477", // tiras de pH
]);

/** Filas basura (encabezados con precio 0 que se colaron como materiales). */
const JUNK_IDS = new Set(["MAT-0455", "MAT-0460", "MAT-0478"]);

const norm = (s: string) => (s || "").trim().toLowerCase().replace(/\s+/g, " ");

function destino(m: CostMaterial): Par {
  if (ID_OVERRIDE[m.id]) return ID_OVERRIDE[m.id];
  if (BROKEN[m.categoria]) return BROKEN[m.categoria];
  if (REMAP[m.categoria]) return REMAP[m.categoria];
  if (m.categoria === "Solventes")
    return REACTIVO_IDS.has(m.id) ? ["REACTIVOS", ""] : ["SOLVENTES", ""];
  return [m.categoria, ""]; // sin cambio
}

export interface GrupoDuplicado {
  nombre: string;
  ids: string[];
}

export interface NormalizacionResultado {
  /** Catálogo corregido (sin las filas basura). */
  materiales: CostMaterial[];
  /** Cuántos cambiaron de categoría o subcategoría. */
  reclasificados: number;
  /** Conteo por categoría → subcategoría tras normalizar. */
  resumen: { categoria: string; subcategoria: string; n: number }[];
  /** Grupos de posibles duplicados (mismo nombre). */
  duplicados: GrupoDuplicado[];
  /** Ids de filas basura eliminadas. */
  eliminados: string[];
}

/** Calcula la normalización (función pura: no escribe nada). */
export function normalizarCatalogo(mats: CostMaterial[]): NormalizacionResultado {
  const eliminados: string[] = [];
  const vivos = mats.filter((m) => {
    if (JUNK_IDS.has(m.id) && !m.precio) {
      eliminados.push(m.id);
      return false;
    }
    return true;
  });

  // Detecta duplicados por nombre normalizado (sobre los vivos).
  const porNombre = new Map<string, CostMaterial[]>();
  for (const m of vivos) {
    const k = norm(m.nombre);
    if (!porNombre.has(k)) porNombre.set(k, []);
    porNombre.get(k)!.push(m);
  }
  const duplicados: GrupoDuplicado[] = [];
  const notaDup = new Map<string, string>();
  for (const grupo of porNombre.values()) {
    if (grupo.length < 2) continue;
    const ids = grupo.map((m) => m.id);
    duplicados.push({ nombre: grupo[0].nombre, ids });
    for (const m of grupo) {
      const otros = ids.filter((i) => i !== m.id).join(", ");
      notaDup.set(m.id, `Posible duplicado de ${otros} — revisar cuál conservar.`);
    }
  }

  let reclasificados = 0;
  const materiales = vivos.map((m) => {
    const [cat, sub] = destino(m);
    const kind = KIND_FIX[m.id] ?? m.kind;
    const cambia = cat !== m.categoria || (sub || "") !== (m.subcategoria || "");
    if (cambia) reclasificados++;
    // Conserva nota previa y añade la de duplicado si aplica (sin duplicar texto).
    let nota = m.nota || "";
    const dup = notaDup.get(m.id);
    if (dup && !nota.includes("Posible duplicado")) {
      nota = nota ? `${nota} · ${dup}` : dup;
    }
    return {
      ...m,
      kind,
      categoria: cat,
      subcategoria: sub || undefined,
      nota,
    } as CostMaterial;
  });

  // Resumen por categoría/subcategoría.
  const conteo = new Map<string, number>();
  for (const m of materiales) {
    const key = `${m.categoria}\u0000${m.subcategoria || ""}`;
    conteo.set(key, (conteo.get(key) || 0) + 1);
  }
  const resumen = [...conteo.entries()]
    .map(([k, n]) => {
      const [categoria, subcategoria] = k.split("\u0000");
      return { categoria, subcategoria, n };
    })
    .sort((a, b) =>
      a.categoria === b.categoria
        ? a.subcategoria.localeCompare(b.subcategoria)
        : a.categoria.localeCompare(b.categoria),
    );

  return { materiales, reclasificados, resumen, duplicados, eliminados };
}
