import { NextResponse } from "next/server";
import { getSession, canWriteWorkArea, canWorkOnProject, editableProjectIds } from "@/lib/auth-server";
import { getDB, mutate, newId, type PayrollEntry } from "@/lib/db";

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
    ? db.payrollEntries.filter((e) => e.projectId === projectId)
    : db.payrollEntries;
  if (!full) entries = entries.filter((e) => e.projectId && editables.includes(e.projectId));
  return NextResponse.json({ entries });
}

export async function POST(req: Request) {
  const session = await getSession();
  let b: Partial<PayrollEntry>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  // projectId opcional: sin él es nómina de la empresa (administrativa).
  const projectId = (b.projectId || "").trim() || null;
  if (!session || !(await canWorkOnProject(session, projectId)))
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const persona = (b.persona || "").trim();
  if (!persona)
    return NextResponse.json({ error: "Falta la persona." }, { status: 400 });
  const diaria = b.diaria != null ? Number(b.diaria) || 0 : undefined;
  const diasQuincena = b.diasQuincena != null ? Number(b.diasQuincena) || 0 : undefined;
  const diasTrabajados = b.diasTrabajados != null ? Number(b.diasTrabajados) || 0 : undefined;
  const descuento = b.descuento != null ? Number(b.descuento) || 0 : undefined;
  // Si viene la tarifa diaria, el monto se calcula (diaria × días − descuento).
  const monto = diaria != null
    ? diaria * (diasTrabajados ?? diasQuincena ?? 0) - (descuento ?? 0)
    : Number(b.monto) || 0;
  const entry: PayrollEntry = {
    id: newId("NOM"),
    projectId,
    persona,
    rol: (b.rol || "").trim() || undefined,
    periodo: (b.periodo || "").trim(),
    fecha: (b.fecha || "").trim() || undefined,
    categoria: (b.categoria || "").trim() || undefined,
    monto,
    pagado: b.pagado === true,
    nota: (b.nota || "").trim() || undefined,
    employeeId: b.employeeId ? String(b.employeeId) : undefined,
    diaria,
    diasQuincena,
    diasTrabajados,
    descuento,
    createdAt: Date.now(),
  };
  await mutate((db) => db.payrollEntries.push(entry));
  return NextResponse.json({ ok: true, entry });
}
