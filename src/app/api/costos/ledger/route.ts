import { NextResponse } from "next/server";
import { getSession, canWriteWorkArea, canWorkOnProject, editableProjectIds } from "@/lib/auth-server";
import { getDB, mutate, newId, type LedgerEntry } from "@/lib/db";
import { cleanComprobante } from "@/lib/costos";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const full = await canWriteWorkArea(session);
  const editables = full ? [] : await editableProjectIds(session);
  if (!full && editables.length === 0)
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const db = await getDB();
  const projectId = new URL(req.url).searchParams.get("projectId");
  let entries = projectId
    ? db.ledgerEntries.filter((e) => e.projectId === projectId)
    : db.ledgerEntries;
  if (!full) entries = entries.filter((e) => e.projectId && editables.includes(e.projectId));
  return NextResponse.json({ entries });
}

export async function POST(req: Request) {
  const session = await getSession();
  let b: Partial<LedgerEntry>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  // projectId opcional: sin él es un gasto general de la empresa.
  const projectId = (b.projectId || "").trim() || null;
  if (!session || !(await canWorkOnProject(session, projectId)))
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const entry: LedgerEntry = {
    id: newId("MOV"),
    projectId,
    fecha: (b.fecha || new Date().toISOString().slice(0, 10)).trim(),
    categoria: (b.categoria || "otro").trim(),
    subcategoria: (b.subcategoria || "").trim() || undefined,
    tipo: b.tipo === "ingreso" ? "ingreso" : "egreso",
    concepto: (b.concepto || "").trim(),
    monto: Number(b.monto) || 0,
    comprobante: cleanComprobante(b.comprobante),
    createdAt: Date.now(),
  };
  await mutate((db) => db.ledgerEntries.push(entry));
  return NextResponse.json({ ok: true, entry });
}
