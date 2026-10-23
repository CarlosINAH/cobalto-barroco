import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { mutate, type CalendarEvent } from "@/lib/db";

export const runtime = "nodejs";

const RECORDATORIOS = [null, 10, 30, 60, 1440] as const;

function sanitizeColor(c: unknown): string {
  return typeof c === "string" && /^#[0-9a-fA-F]{6}$/.test(c) ? c : "#1B2A5E";
}
function sanitizeReminder(v: unknown): number | null {
  const n = v === null || v === undefined ? null : Number(v);
  return (RECORDATORIOS as readonly (number | null)[]).includes(n) ? n : null;
}
function canonIntegrantes(
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

/** Edita un evento. Cualquier empleado autenticado puede hacerlo (calendario compartido). */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { id } = await params;

  let b: Partial<CalendarEvent>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const updated = await mutate((db) => {
    const ev = db.events.find((x) => x.id === id);
    if (!ev) return null;

    if (b.titulo !== undefined) {
      const t = b.titulo.trim();
      if (!t) return "empty";
      ev.titulo = t;
    }
    if (b.descripcion !== undefined) ev.descripcion = b.descripcion.trim();
    if (b.lugar !== undefined) ev.lugar = b.lugar.trim();
    if (b.allDay !== undefined) ev.allDay = !!b.allDay;
    if (b.color !== undefined) ev.color = sanitizeColor(b.color);
    if (b.integrantes !== undefined)
      ev.integrantes = canonIntegrantes(b.integrantes, db.employees);

    // Si cambia el horario o el recordatorio, se rearma el aviso.
    let reset = false;
    if (b.inicio !== undefined && Number.isFinite(Number(b.inicio))) {
      ev.inicio = Number(b.inicio);
      reset = true;
    }
    if (b.fin !== undefined && Number.isFinite(Number(b.fin))) {
      ev.fin = Number(b.fin);
    }
    if (ev.fin < ev.inicio) ev.fin = ev.inicio;
    if (b.recordatorioMin !== undefined) {
      ev.recordatorioMin = sanitizeReminder(b.recordatorioMin);
      reset = true;
    }
    if (reset) ev.recordatorioEnviado = false;

    return ev;
  });

  if (updated === null)
    return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  if (updated === "empty")
    return NextResponse.json(
      { error: "El título es obligatorio." },
      { status: 400 },
    );
  return NextResponse.json({ ok: true, event: updated });
}

/** Borra un evento. Cualquier empleado autenticado puede hacerlo. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { id } = await params;
  const existed = await mutate((db) => {
    const before = db.events.length;
    db.events = db.events.filter((x) => x.id !== id);
    return db.events.length < before;
  });
  if (!existed)
    return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
