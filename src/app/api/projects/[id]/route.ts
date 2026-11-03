import { NextResponse } from "next/server";
import { getSession, canWriteWorkArea, canEditProject, requireWorkAreaWrite } from "@/lib/auth-server";
import { mutate, newId, type Project, type CVEntry } from "@/lib/db";
import { registrarMovimiento } from "@/lib/bitacora";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  const { id } = await params;
  // Permite editar al área de trabajo (admin/total) y a los editores del
  // proyecto (proyectoEdita). Solo el área de trabajo toca los montos.
  if (!session || !(await canEditProject(session, id))) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }
  const conMontos = await canWriteWorkArea(session);
  let b: Partial<Project>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const updated = await mutate((db) => {
    const p = db.projects.find((x) => x.id === id);
    if (!p) return null;
    if (b.nombre !== undefined) p.nombre = b.nombre.trim();
    if (b.ubicacion !== undefined) p.ubicacion = b.ubicacion.trim();
    if (b.inicio !== undefined) p.inicio = b.inicio;
    if (b.entrega !== undefined) p.entrega = b.entrega;
    if (b.avance !== undefined) p.avance = Math.max(0, Math.min(100, Number(b.avance) || 0));
    if (b.estado !== undefined) p.estado = b.estado;
    if (b.desc !== undefined) p.desc = b.desc.trim();
    if (b.cliente !== undefined) p.cliente = b.cliente.trim() || undefined;
    if (b.tipo !== undefined) p.tipo = b.tipo.trim() || undefined;
    if (b.carpetaInformes !== undefined) p.carpetaInformes = b.carpetaInformes.trim() || undefined;
    // Cuadrilla del proyecto: por rol, qué empleados lo cubren (operativo, no
    // monetario: lo puede editar cualquier editor del proyecto).
    if (b.cuadrillaAsign !== undefined) {
      p.cuadrillaAsign = Array.isArray(b.cuadrillaAsign)
        ? b.cuadrillaAsign
            .filter((r) => r && typeof r.rol === "string" && r.rol.trim())
            .map((r) => ({
              rol: r.rol.trim(),
              empleadoIds: Array.isArray(r.empleadoIds)
                ? [...new Set(r.empleadoIds.map(String).filter(Boolean))]
                : [],
            }))
        : undefined;
    }
    // Los montos solo los toca el área de trabajo (admin/total); un editor por
    // proyecto no los ve ni los modifica.
    if (conMontos) {
      const num = (v: unknown) => (v == null || v === "" ? undefined : Number(v) || 0);
      if (b.montoTotal !== undefined) p.montoTotal = num(b.montoTotal);
      if (b.anticipo !== undefined) p.anticipo = num(b.anticipo);
      if (b.egresos !== undefined) p.egresos = num(b.egresos);
      if (b.utilidad !== undefined) p.utilidad = num(b.utilidad);
    }
    // Al marcarse FINALIZADO, el proyecto se suma al CV de la empresa (una sola
    // vez: no se duplica si ya tiene su entrada de currículum).
    if (b.estado === "finalizado" && !db.cvEntries.some((c) => c.projectId === p.id)) {
      const yStr = (p.entrega || p.inicio || "").slice(0, 4);
      const anio = Number(yStr) > 0 ? Number(yStr) : new Date().getFullYear();
      const cv: CVEntry = {
        id: newId("CV"),
        anio,
        fecha: p.entrega || p.inicio || "",
        tipoBien: p.tipo || undefined,
        lugar: p.ubicacion || undefined,
        titulo: p.nombre,
        descripcion: p.desc || undefined,
        projectId: p.id,
        createdAt: Date.now(),
      };
      db.cvEntries.push(cv);
    }
    return p;
  });
  if (!updated) return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  await registrarMovimiento(session, {
    accion: "editar", entidad: "proyecto", entidadId: updated.id,
    descripcion: `Proyecto «${updated.nombre}»`, projectId: updated.id,
  });
  return NextResponse.json({ ok: true, project: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireWorkAreaWrite();
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }
  const { id } = await params;
  const nombre = await mutate((db) => {
    const p = db.projects.find((x) => x.id === id);
    const n = p?.nombre;
    db.projects = db.projects.filter((x) => x.id !== id);
    // Desasigna empleados de ese proyecto.
    db.employees.forEach((e) => {
      if (e.proyectoId === id) e.proyectoId = null;
    });
    return n;
  });
  await registrarMovimiento(session, {
    accion: "borrar", entidad: "proyecto", entidadId: id,
    descripcion: nombre ? `Proyecto «${nombre}»` : undefined, projectId: id,
  });
  return NextResponse.json({ ok: true });
}
