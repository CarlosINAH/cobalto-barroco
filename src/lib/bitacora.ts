import "server-only";
import { mutate, newId, type Movimiento } from "@/lib/db";
import type { Session } from "@/lib/session";

/** Máximo de entradas que se conservan (las más antiguas se descartan). */
const MAX_MOVIMIENTOS = 5000;

export interface MovimientoInput {
  accion: string;
  entidad: string;
  entidadId?: string;
  descripcion?: string;
  projectId?: string | null;
}

/**
 * Registra un movimiento en la bitácora. Nunca lanza: la auditoría no debe
 * tumbar la operación principal. El nombre del actor se toma de su ficha en el
 * mismo write para no depender de joins al leer.
 */
export async function registrarMovimiento(session: Session, mov: MovimientoInput): Promise<void> {
  try {
    await mutate((d) => {
      const emp = d.employees.find(
        (e) => e.username.toLowerCase() === session.username.toLowerCase(),
      );
      const entry: Movimiento = {
        id: newId("MVT"),
        ts: Date.now(),
        actor: session.username,
        actorNombre: emp?.nombre || session.username,
        accion: mov.accion,
        entidad: mov.entidad,
        entidadId: mov.entidadId,
        descripcion: mov.descripcion,
        projectId: mov.projectId ?? null,
      };
      if (!d.movimientos) d.movimientos = [];
      d.movimientos.push(entry);
      if (d.movimientos.length > MAX_MOVIMIENTOS) {
        d.movimientos.splice(0, d.movimientos.length - MAX_MOVIMIENTOS);
      }
    });
  } catch {
    /* la bitácora es best-effort */
  }
}
