/**
 * Ficha de registro del presupuesto (la "primera hoja"): datos del bien a
 * intervenir. Módulo puro (sin `server-only`) para poder usarse también desde
 * componentes cliente. Debe llenarse antes de capturar precios; la descripción
 * alimenta el PDF de la cotización.
 */
export interface BudgetFicha {
  /** Nombre del bien a intervenir. */
  bien?: string;
  /** Recinto o inmueble donde se encuentra. */
  recinto?: string;
  ciudad?: string;
  /** Entidad federativa (estado de la república). */
  entidad?: string;
  /** Nombre del contacto. */
  contacto?: string;
  /** Institución o empresa (en caso de trabajo en conjunto). */
  institucion?: string;
  /** Tipo de bien: escultura, caballete, mural, retablo… */
  tipoBien?: string;
  /** Material principal: metal, madera, piedra… */
  material?: string;
  /** Breve descripción del proyecto (va al PDF). */
  descripcion?: string;
}

/** Campos obligatorios de la ficha para habilitar la captura de precios. */
export function fichaCompleta(ficha?: BudgetFicha): boolean {
  if (!ficha) return false;
  const req = [ficha.bien, ficha.ciudad, ficha.entidad, ficha.tipoBien, ficha.material];
  if (req.some((v) => !v || !String(v).trim())) return false;
  // Al menos un dato del cliente (contacto o institución).
  return Boolean(
    (ficha.contacto && ficha.contacto.trim()) ||
      (ficha.institucion && ficha.institucion.trim()),
  );
}

/** Normaliza una ficha recibida del cliente (recorta y descarta vacíos). */
export function cleanFicha(raw: unknown): BudgetFicha | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  const s = (k: string) => {
    const v = typeof r[k] === "string" ? (r[k] as string).trim() : "";
    return v || undefined;
  };
  const f: BudgetFicha = {
    bien: s("bien"), recinto: s("recinto"), ciudad: s("ciudad"), entidad: s("entidad"),
    contacto: s("contacto"), institucion: s("institucion"),
    tipoBien: s("tipoBien"), material: s("material"), descripcion: s("descripcion"),
  };
  return Object.values(f).some((v) => v !== undefined) ? f : undefined;
}
