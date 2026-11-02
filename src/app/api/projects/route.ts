import { NextResponse } from "next/server";
import { getSession, canWriteWorkArea } from "@/lib/auth-server";
import { getDB, mutate, newId, type Project } from "@/lib/db";
import { registrarMovimiento } from "@/lib/bitacora";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const db = await getDB();
  // El área de trabajo (admin / nivel total) ve todo. El resto ve solo sus
  // proyectos (asignados o editables) y SIN los montos de dinero (son solo del
  // área): se devuelven únicamente los campos no sensibles.
  if (await canWriteWorkArea(session)) {
    return NextResponse.json({ projects: db.projects });
  }
  const emp = db.employees.find(
    (e) => e.username.toLowerCase() === session.username.toLowerCase(),
  );
  const ids = new Set<string>([
    ...(emp?.proyectoIds ?? []),
    ...(emp?.proyectoEdita ?? []),
    ...(emp?.proyectoId ? [emp.proyectoId] : []),
  ]);
  const projects = db.projects
    .filter((p) => ids.has(p.id))
    .map((p) => ({
      id: p.id, nombre: p.nombre, ubicacion: p.ubicacion, inicio: p.inicio,
      entrega: p.entrega, avance: p.avance, estado: p.estado, desc: p.desc,
      createdAt: p.createdAt, cliente: p.cliente, tipo: p.tipo,
      carpetaInformes: p.carpetaInformes,
    }));
  return NextResponse.json({ projects });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  // Crear proyectos es del área de trabajo: admin o nivel "total" en proyectos
  // o administración. El resto participa en los proyectos que se le asignan.
  const puedeMontos = await canWriteWorkArea(session);
  if (!puedeMontos) {
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
    // Montos de dinero: solo quien tiene escritura en el área.
    montoTotal: puedeMontos ? num(b.montoTotal) : undefined,
    anticipo: puedeMontos ? num(b.anticipo) : undefined,
    egresos: puedeMontos ? num(b.egresos) : undefined,
    utilidad: puedeMontos ? num(b.utilidad) : undefined,
  };
  await mutate((db) => db.projects.unshift(project));
  await registrarMovimiento(session, {
    accion: "crear", entidad: "proyecto", entidadId: project.id,
    descripcion: `Proyecto «${project.nombre}»`, projectId: project.id,
  });
  return NextResponse.json({ ok: true, project });
}
