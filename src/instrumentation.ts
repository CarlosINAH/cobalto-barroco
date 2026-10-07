/**
 * Hook de instrumentación de Next: corre una vez al arrancar el servidor.
 * Lo usamos para encender el temporizador de recordatorios del calendario.
 * Solo en el runtime Node (no en Edge ni durante el build).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startReminderLoop } = await import("@/lib/reminders");
    startReminderLoop();
  }
}
