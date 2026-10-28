import { NextResponse } from "next/server";
import { requireWorkAreaWrite } from "@/lib/auth-server";
import {
  getDB,
  mutate,
  newId,
  FACTOR_INDIRECTOS,
  FACTOR_UTILIDAD,
  type Concept,
} from "@/lib/db";
import { buildCatalogs, recomputeConcept } from "@/lib/pu";
import { cleanInputs } from "@/lib/costos";

export const runtime = "nodejs";

async function requireAdmin() {
  return requireWorkAreaWrite();
}

export async function GET() {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const db = await getDB();
  return NextResponse.json({ conceptos: db.concepts });
}

export async function POST(req: Request) {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  let b: Partial<Concept>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const concepto = (b.concepto || "").trim();
  if (!concepto)
    return NextResponse.json(
      { error: "El nombre del concepto es obligatorio." },
      { status: 400 },
    );
  const concept: Concept = {
    id: newId("CON"),
    clave: (b.clave || "").trim(),
    concepto,
    descripcion: (b.descripcion || "").trim(),
    unidad: (b.unidad || "").trim(),
    materialIntervencion: (b.materialIntervencion || "").trim() || undefined,
    insumos: cleanInputs(b.insumos),
    factorIndirectos:
      b.factorIndirectos != null ? Number(b.factorIndirectos) : FACTOR_INDIRECTOS,
    factorUtilidad:
      b.factorUtilidad != null ? Number(b.factorUtilidad) : FACTOR_UTILIDAD,
    tiempoPU: b.tiempoPU != null ? Number(b.tiempoPU) : null,
    costoDirecto: 0,
    pu: 0,
    global: b.global !== false,
    createdAt: Date.now(),
  };
  const saved = await mutate((db) => {
    recomputeConcept(concept, buildCatalogs(db));
    db.concepts.push(concept);
    return concept;
  });
  return NextResponse.json({ ok: true, concepto: saved });
}
