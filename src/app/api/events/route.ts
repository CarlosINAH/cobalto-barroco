import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { getDB, mutate, newId, type CalendarEvent } from "@/lib/db";
import { notificarEventoNuevo } from "@/lib/reminders";
import { driveConnected, driveAccessToken } from "@/lib/drive";
import { gcalCreateEvent } from "@/lib/gcal";

export const runtime = "nodejs";

const emailValido = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || "");

/** Correos de los integrantes de un evento (para invitarlos en Google Calendar). */
async function correosIntegrantes(ev: CalendarEvent): Promise<string[]> {
  if (!ev.integrantes.length) return [];
  const db = await getDB();
  return db.employees
    .filter((e) => ev.integrantes.some((u) => u.toLowerCase() === e.username.toLowerCase()))
    .map((e) => e.email)
    .filter(emailValido);
}

/**
 * Espeja el evento en el Google Calendar central (si está conectado) y, si tiene
 * integrantes con correo, Google les manda la invitación. Devuelve si se invitó
 * por Google (para no duplicar con el correo SMTP). Best-effort.
 */
async function espejarEnGoogle(event: CalendarEvent): Promise<{ invited: boolean }> {
  try {
    if (!(await driveConnected())) return { invited: false };
    const token = await driveAccessToken();
    if (!token) return { invited: false };
    const emails = await correosIntegrantes(event);
    const g = await gcalCreateEvent(token, event, emails);
    if (g?.id) {
      await mutate((db) => {
        const ev = db.events.find((x) => x.id === event.id);
        if (ev) ev.googleEventId = g.id;
      });
      return { invited: emails.length > 0 };
    }
  } catch {
    /* best-effort */
  }
  return { invited: false };
}

/** Recordatorios permitidos (minutos antes). null = sin recordatorio. */
const RECORDATORIOS = [null, 10, 30, 60, 1440] as const;

function sanitizeColor(c: unknown): string {
  return typeof c === "string" && /^#[0-9a-fA-F]{6}$/.test(c) ? c : "#1B2A5E";
}

function sanitizeReminder(v: unknown): number | null {
  const n = v === null || v === undefined ? null : Number(v);
  return (RECORDATORIOS as readonly (number | null)[]).includes(n) ? n : null;
}

/** Deja solo los integrantes que son empleados reales, con su username canónico. */
export function canonIntegrantes(
  raw: unknown,
  employees: { username: string }[],
): string[] {
  if (!Array.isArray(raw)) return [];
  const byLower = new Map(employees.map((e) => [e.username.toLowerCase(), e.username]));
  const out = new Set<string>();
  for (const u of raw) {
    const canon = byLower.get(String(u).toLowerCase());
    if (canon) out.add(canon);
  }
  return [...out];
}

/** Calendario de empresa: cualquier usuario autenticado ve todos los eventos. */
export async function GET() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const db = await getDB();
  const events = [...db.events]
    .map((e) => ({ ...e, integrantes: e.integrantes ?? [] }))
    .sort((a, b) => a.inicio - b.inicio);
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
    integrantes: [],
    recordatorioMin: sanitizeReminder(b.recordatorioMin),
    recordatorioEnviado: false,
    creadoPor: session.username,
    creadoEn: Date.now(),
  };
  await mutate((db) => {
    event.integrantes = canonIntegrantes(b.integrantes, db.employees);
    db.events.push(event);
  });
  // Espeja en Google Calendar (invitación nativa si hay integrantes). Si Google
  // no invitó (no conectado o sin integrantes), se avisa por correo SMTP.
  const { invited } = await espejarEnGoogle(event);
  if (!invited) await notificarEventoNuevo(event);
  return NextResponse.json({ ok: true, event });
}
