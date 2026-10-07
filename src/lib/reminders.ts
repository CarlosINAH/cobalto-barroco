import "server-only";
import { getDB, mutate, type CalendarEvent } from "@/lib/db";
import { sendMail, mailConfigured } from "@/lib/mailer";

/**
 * Recordatorios del calendario por correo.
 *
 * El NAS no tiene cron ni programador de tareas, pero la app corre como un
 * proceso Node continuo dentro del contenedor, así que arrancamos aquí un
 * temporizador interno (desde instrumentation.ts) que, cada minuto, revisa si
 * algún evento entró en su ventana de recordatorio y manda el aviso por correo
 * a todo el equipo. Si el SMTP no está configurado, no hace nada (y reintenta
 * mientras el evento no haya pasado).
 */

const INTERVALO_MS = 60_000; // revisa cada minuto
const TZ = "America/Mexico_City";

let timer: ReturnType<typeof setInterval> | null = null;

function emailValido(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || "");
}

function fmtFecha(ev: CalendarEvent): string {
  const opts: Intl.DateTimeFormatOptions = ev.allDay
    ? { dateStyle: "full", timeZone: TZ }
    : { dateStyle: "full", timeStyle: "short", timeZone: TZ };
  return new Intl.DateTimeFormat("es-MX", opts).format(new Date(ev.inicio));
}

function cuerpo(ev: CalendarEvent): string {
  const lineas = [
    `Recordatorio de evento: ${ev.titulo}`,
    "",
    `Cuándo: ${fmtFecha(ev)}`,
  ];
  if (ev.lugar) lineas.push(`Dónde: ${ev.lugar}`);
  if (ev.descripcion) lineas.push("", ev.descripcion);
  lineas.push("", "— Calendario de Cobalto Barroco");
  return lineas.join("\n");
}

/** Una pasada: busca eventos cuyo recordatorio toca y los avisa. */
export async function runReminderScan(): Promise<void> {
  const db = await getDB();
  const now = Date.now();

  const due = db.events.filter(
    (e) =>
      e.recordatorioMin != null &&
      !e.recordatorioEnviado &&
      now >= e.inicio - e.recordatorioMin * 60_000,
  );
  if (due.length === 0) return;

  const destinatarios = db.employees
    .map((e) => e.email)
    .filter((e) => emailValido(e));

  const marcar: string[] = [];
  for (const ev of due) {
    const yaPaso = now >= ev.inicio;
    if (!yaPaso && mailConfigured() && destinatarios.length > 0) {
      const subject = `Recordatorio: ${ev.titulo}`;
      const text = cuerpo(ev);
      for (const to of destinatarios) {
        await sendMail({ to, subject, text });
      }
      marcar.push(ev.id);
    } else if (yaPaso) {
      // La ventana ya pasó: lo marcamos para no reintentar indefinidamente.
      marcar.push(ev.id);
    }
    // Si no hay SMTP y el evento aún no pasa, se deja para el próximo ciclo.
  }

  if (marcar.length > 0) {
    const ids = new Set(marcar);
    await mutate((d) => {
      d.events.forEach((e) => {
        if (ids.has(e.id)) e.recordatorioEnviado = true;
      });
    });
  }
}

/** Arranca el temporizador (idempotente). Se llama desde instrumentation.ts. */
export function startReminderLoop(): void {
  if (timer) return;
  timer = setInterval(() => {
    runReminderScan().catch((err) => {
      console.error("[reminders] error en la revisión:", err);
    });
  }, INTERVALO_MS);
  // No bloquear el apagado del proceso por el temporizador.
  if (typeof timer.unref === "function") timer.unref();
  console.log("[reminders] temporizador de recordatorios iniciado.");
}
