import { NextResponse } from "next/server";
import { requireWorkAreaWrite } from "@/lib/auth-server";
import { getDB, mutate, newId, type LaborRate } from "@/lib/db";

export const runtime = "nodejs";

async function requireAdmin() {
  return requireWorkAreaWrite();
}

export async function GET() {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const db = await getDB();
  return NextResponse.json({ salarios: db.laborRates });
}

export async function POST(req: Request) {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  let b: Partial<LaborRate>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const rol = (b.rol || "").trim();
  if (!rol)
    return NextResponse.json({ error: "El rol es obligatorio." }, { status: 400 });
  const jornada = Number(b.jornada) || 0;
  const rate: LaborRate = {
    id: newId("SAL"),
    rol,
    jornada,
    // Deriva hora/semana/mes de la jornada si no vienen (8 h, 5 días, 4 semanas).
    hora: b.hora != null ? Number(b.hora) : jornada / 8,
    semana: b.semana != null ? Number(b.semana) : jornada * 5,
    mes: b.mes != null ? Number(b.mes) : jornada * 20,
    createdAt: Date.now(),
  };
  await mutate((db) => db.laborRates.push(rate));
  return NextResponse.json({ ok: true, salario: rate });
}
