import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { getDB, mutate, newId, type Attendance } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const db = await getDB();
  const mias = db.attendance
    .filter((a) => a.empleadoUsername.toLowerCase() === session.username.toLowerCase())
    .sort((a, b) => b.createdAt - a.createdAt);
  const ultimo = mias[0] || null;
  return NextResponse.json({ registros: mias.slice(0, 30), ultimo });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  let b: { tipo?: string };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const tipo = b.tipo === "salida" ? "salida" : "entrada";
  const now = new Date();
  const rec: Attendance = {
    id: newId("ASI"),
    empleadoUsername: session.username,
    fecha: now.toISOString().slice(0, 10),
    hora: now.toTimeString().slice(0, 5),
    tipo,
    createdAt: Date.now(),
  };
  await mutate((d) => d.attendance.unshift(rec));
  return NextResponse.json({ ok: true, registro: rec });
}
