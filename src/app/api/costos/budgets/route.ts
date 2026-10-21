import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import {
  getDB,
  mutate,
  newId,
  FACTOR_INDIRECTOS,
  FACTOR_UTILIDAD,
  FACTOR_IVA,
  type Budget,
} from "@/lib/db";
import { cleanBudgetLines } from "@/lib/costos";

export const runtime = "nodejs";

async function requireAdmin() {
  const session = await getSession();
  return session && session.role === "admin" ? session : null;
}

export async function GET(req: Request) {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const db = await getDB();
  const projectId = new URL(req.url).searchParams.get("projectId");
  const budgets = projectId
    ? db.budgets.filter((b) => b.projectId === projectId)
    : db.budgets;
  return NextResponse.json({ budgets });
}

export async function POST(req: Request) {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  let b: Partial<Budget>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const projectId = (b.projectId || "").trim();
  if (!projectId)
    return NextResponse.json(
      { error: "El presupuesto debe pertenecer a un proyecto." },
      { status: 400 },
    );
  const now = Date.now();
  const budget: Budget = {
    id: newId("PRE"),
    projectId,
    nombre: (b.nombre || "Presupuesto").trim(),
    cliente: (b.cliente || "").trim(),
    lineas: cleanBudgetLines(b.lineas),
    factorIva: b.factorIva != null ? Number(b.factorIva) : FACTOR_IVA,
    factorIndirectos:
      b.factorIndirectos != null ? Number(b.factorIndirectos) : FACTOR_INDIRECTOS,
    factorUtilidad:
      b.factorUtilidad != null ? Number(b.factorUtilidad) : FACTOR_UTILIDAD,
    createdAt: now,
    updatedAt: now,
  };
  await mutate((db) => db.budgets.push(budget));
  return NextResponse.json({ ok: true, budget });
}
