import { NextResponse } from "next/server";
import { requireWorkAreaWrite } from "@/lib/auth-server";
import { getDB, mutate, newId, type PayrollEntry } from "@/lib/db";

export const runtime = "nodejs";

async function requireAdmin() {
  return requireWorkAreaWrite();
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
