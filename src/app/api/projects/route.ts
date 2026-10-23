import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { getDB, mutate, newId, type Project } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const db = await getDB();
  return NextResponse.json({ projects: db.projects });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  // Empleados también pueden registrar proyectos, pero NO los montos de dinero.
  const isAdmin = session.role === "admin";
  let b: Partial<Project>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  if (!b.nombre || !b.nombre.trim()) {
    return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 });
  }
  const num = (v: unknown) => (v == null || v === "" ? undefined : Number(v) || 0);
  const project: Project = {
    id: newId("PRY"),
    nombre: b.nombre.trim(),
    ubicacion: b.ubicacion?.trim() || "",
    inicio: b.inicio || "",
    entrega: b.entrega || "",
    avance: Math.max(0, Math.min(100, Number(b.avance) || 0)),
    estado: b.estado === "finalizado" || b.estado === "futuro" ? b.estado : "activo",
    desc: b.desc?.trim() || "",
    createdAt: Date.now(),
    cliente: b.cliente?.trim() || undefined,
    tipo: b.tipo?.trim() || undefined,
    // Montos de dinero: solo administración.
    montoTotal: isAdmin ? num(b.montoTotal) : undefined,
    anticipo: isAdmin ? num(b.anticipo) : undefined,
    egresos: isAdmin ? num(b.egresos) : undefined,
    utilidad: isAdmin ? num(b.utilidad) : undefined,
  };
  await mutate((db) => db.projects.unshift(project));
  return NextResponse.json({ ok: true, project });
}
