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
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }
  let b: Partial<Project>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  if (!b.nombre || !b.nombre.trim()) {
    return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 });
  }
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
  };
  await mutate((db) => db.projects.unshift(project));
  return NextResponse.json({ ok: true, project });
}
