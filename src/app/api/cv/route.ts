import { NextResponse } from "next/server";
import { getSession, sectionLevel, canWriteSection } from "@/lib/auth-server";
import { getDB, mutate, newId, type CVEntry } from "@/lib/db";

export const runtime = "nodejs";

/** Normaliza una entrada de CV recibida del cliente. */
function clean(b: Partial<CVEntry>): Omit<CVEntry, "id" | "createdAt"> {
  const anio = Number(b.anio);
  return {
    clave: (b.clave || "").trim() || undefined,
    anio: Number.isFinite(anio) && anio > 0 ? Math.trunc(anio) : new Date().getFullYear(),
    fecha: (b.fecha || "").trim(),
    clasificacion: (b.clasificacion || "").trim() || undefined,
    tipoBien: (b.tipoBien || "").trim() || undefined,
    lugar: (b.lugar || "").trim() || undefined,
    sitio: (b.sitio || "").trim() || undefined,
    titulo: (b.titulo || "").trim(),
    descripcion: (b.descripcion || "").trim() || undefined,
    colaboracion: (b.colaboracion || "").trim() || undefined,
    projectId: b.projectId ? String(b.projectId) : null,
  };
}

export async function GET() {
  const session = await getSession();
  if (!session || (await sectionLevel(session, "cv")) === "oculto")
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const db = await getDB();
  return NextResponse.json({ entries: db.cvEntries });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !(await canWriteSection(session, "cv")))
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  let b: Partial<CVEntry>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const data = clean(b);
  if (!data.titulo)
    return NextResponse.json({ error: "El título es obligatorio." }, { status: 400 });
  const entry: CVEntry = { id: newId("CV"), ...data, createdAt: Date.now() };
  await mutate((db) => db.cvEntries.push(entry));
  return NextResponse.json({ ok: true, entry });
}
