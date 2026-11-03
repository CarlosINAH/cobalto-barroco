import "server-only";

/**
 * Espejo de eventos en el Google Calendar central de la empresa. Reutiliza el
 * access token de la cuenta central (el mismo del Drive, ver lib/drive); al
 * crear un evento con invitados, Google envía la invitación por correo. Todo
 * best-effort: si algo falla, no debe tumbar la operación de la app.
 */

const CAL_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
const TZ = "America/Mexico_City";

export interface GcalEventInput {
  titulo: string;
  descripcion?: string;
  lugar?: string;
  inicio: number;
  fin: number;
  allDay: boolean;
}

/** Fecha YYYY-MM-DD en la zona de la empresa (para eventos de todo el día). */
function ymd(ms: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));
}

function cuerpo(ev: GcalEventInput, attendees: string[]) {
  const start = ev.allDay
    ? { date: ymd(ev.inicio) }
    : { dateTime: new Date(ev.inicio).toISOString(), timeZone: TZ };
  // En Google la fecha final de un evento de todo el día es EXCLUSIVA (+1 día).
  const end = ev.allDay
    ? { date: ymd(ev.fin + 86_400_000) }
    : { dateTime: new Date(ev.fin).toISOString(), timeZone: TZ };
  return {
    summary: ev.titulo,
    description: ev.descripcion || undefined,
    location: ev.lugar || undefined,
    start,
    end,
    attendees: attendees.map((email) => ({ email })),
  };
}

/** Crea el evento en Google Calendar. Devuelve su id, o null si falla/no aplica. */
export async function gcalCreateEvent(
  accessToken: string,
  ev: GcalEventInput,
  attendees: string[],
): Promise<{ id: string; htmlLink?: string } | null> {
  try {
    const res = await fetch(`${CAL_URL}?sendUpdates=all`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo(ev, attendees)),
    });
    if (!res.ok) return null;
    const d = (await res.json()) as { id?: string; htmlLink?: string };
    return d.id ? { id: d.id, htmlLink: d.htmlLink } : null;
  } catch {
    return null;
  }
}

/** Actualiza el evento espejo en Google Calendar. Best-effort. */
export async function gcalUpdateEvent(
  accessToken: string,
  gcalId: string,
  ev: GcalEventInput,
  attendees: string[],
): Promise<boolean> {
  try {
    const res = await fetch(`${CAL_URL}/${encodeURIComponent(gcalId)}?sendUpdates=all`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo(ev, attendees)),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Borra (cancela) el evento espejo en Google Calendar. Best-effort. */
export async function gcalDeleteEvent(accessToken: string, gcalId: string): Promise<boolean> {
  try {
    const res = await fetch(`${CAL_URL}/${encodeURIComponent(gcalId)}?sendUpdates=all`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return res.ok || res.status === 404 || res.status === 410;
  } catch {
    return false;
  }
}
