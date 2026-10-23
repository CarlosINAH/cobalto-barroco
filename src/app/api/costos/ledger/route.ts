import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { getDB, mutate, newId, type LedgerEntry } from "@/lib/db";

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
    ? db.ledgerEntries.filter((e) => e.projectId === projectId)
    : db.ledgerEntries;
  return NextResponse.json({ entries });
}

export async function POST(req: Request) {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  let b: Partial<LedgerEntry>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  // projectId opcional: sin él es un gasto general de la empresa.
  const projectId = (b.projectId || "").trim() || null;
  const entry: LedgerEntry = {
    id: newId("MOV"),
    projectId,
    fecha: (b.fecha || new Date().toISOString().slice(0, 10)).trim(),
    categoria: (b.categoria || "otro").trim(),
    tipo: b.tipo === "ingreso" ? "ingreso" : "egreso",
    concepto: (b.concepto || "").trim(),
    monto: Number(b.monto) || 0,
    createdAt: Date.now(),
  };
  await mutate((db) => db.ledgerEntries.push(entry));
  return NextResponse.json({ ok: true, entry });
}
