import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { getDB, mutate, newId, type PayrollEntry } from "@/lib/db";

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
  const entries = projectId
    ? db.payrollEntries.filter((e) => e.projectId === projectId)
    : db.payrollEntries;
  return NextResponse.json({ entries });
}

export async function POST(req: Request) {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  let b: Partial<PayrollEntry>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  // projectId opcional: sin él es nómina de la empresa (administrativa).
  const projectId = (b.projectId || "").trim() || null;
  const persona = (b.persona || "").trim();
  if (!persona)
    return NextResponse.json({ error: "Falta la persona." }, { status: 400 });
  const entry: PayrollEntry = {
    id: newId("NOM"),
    projectId,
    persona,
    rol: (b.rol || "").trim() || undefined,
    periodo: (b.periodo || "").trim(),
    fecha: (b.fecha || "").trim() || undefined,
    categoria: (b.categoria || "").trim() || undefined,
    monto: Number(b.monto) || 0,
    pagado: b.pagado === true,
    nota: (b.nota || "").trim() || undefined,
    createdAt: Date.now(),
  };
  await mutate((db) => db.payrollEntries.push(entry));
  return NextResponse.json({ ok: true, entry });
}
