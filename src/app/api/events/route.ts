import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { getDB, mutate, newId, type CalendarEvent } from "@/lib/db";

export const runtime = "nodejs";

/** Recordatorios permitidos (minutos antes). null = sin recordatorio. */
const RECORDATORIOS = [null, 10, 30, 60, 1440] as const;

function sanitizeColor(c: unknown): string {
  return typeof c === "string" && /^#[0-9a-fA-F]{6}$/.test(c) ? c : "#1B2A5E";
}

function sanitizeReminder(v: unknown): number | null {
  const n = v === null || v === undefined ? null : Number(v);
  return (RECORDATORIOS as readonly (number | null)[]).includes(n) ? n : null;
}

/** Calendario de empresa: cualquier usuario autenticado ve todos los eventos. */
export async function GET() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const db = await getDB();
  const events = [...db.events].sort((a, b) => a.inicio - b.inicio);
  return NextResponse.json({ events });
}

/** Crea un evento. Cualquier empleado autenticado puede hacerlo. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  let b: Partial<CalendarEvent>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const titulo = (b.titulo || "").trim();
  if (!titulo) {
    return NextResponse.json(
      { error: "El título es obligatorio." },
      { status: 400 },
    );
  }
  const inicio = Number(b.inicio);
  let fin = Number(b.fin);
  if (!Number.isFinite(inicio)) {
    return NextResponse.json({ error: "Fecha inválida." }, { status: 400 });
  }
  if (!Number.isFinite(fin) || fin < inicio) fin = inicio;

  const event: CalendarEvent = {
    id: newId("EVT"),
    titulo,
    descripcion: (b.descripcion || "").trim(),
    lugar: (b.lugar || "").trim(),
    inicio,
    fin,
    allDay: !!b.allDay,
    color: sanitizeColor(b.color),
    recordatorioMin: sanitizeReminder(b.recordatorioMin),
    recordatorioEnviado: false,
    creadoPor: session.username,
    creadoEn: Date.now(),
  };
  await mutate((db) => db.events.push(event));
  return NextResponse.json({ ok: true, event });
}
