import "server-only";
import { getDB, mutate, type AccessEntry } from "@/lib/db";
import { isAdmin } from "@/lib/session";

export type AccessDecision = "allow" | "pending" | "rejected";

function norm(u: string): string {
  return u.trim().toLowerCase();
}

/**
 * Decide si un usuario del NAS puede usar la plataforma. Registra una solicitud
 * "pendiente" la primera vez que entra alguien nuevo (que no sea admin ni un
 * empleado ya dado de alta, a quienes se aprueba automáticamente).
 */
export async function evaluateAccess(username: string): Promise<AccessDecision> {
  if (isAdmin(username)) return "allow";
  const u = norm(username);
  const db = await getDB();

  const entry = db.access.find((a) => norm(a.username) === u);
  if (entry) {
    if (entry.estado === "aprobado") return "allow";
    if (entry.estado === "rechazado") return "rejected";
    return "pending";
  }

  // Sin registro: los empleados ya existentes quedan aprobados (no bloquear al
  // equipo actual); cualquier otro queda pendiente de aprobación.
  const emp = db.employees.find((e) => norm(e.username) === u);
  const grandfathered = !!emp;
  await mutate((d) => {
    if (d.access.some((a) => norm(a.username) === u)) return; // guard de carrera
    d.access.push({
      username: username.trim(),
      nombre: emp?.nombre,
      estado: grandfathered ? "aprobado" : "pendiente",
      solicitadoEn: Date.now(),
      ...(grandfathered ? { decididoEn: Date.now(), decididoPor: "sistema" } : {}),
    });
  });
  return grandfathered ? "allow" : "pending";
}

/** Lista todas las solicitudes/estados de acceso. */
export async function listAccess(): Promise<AccessEntry[]> {
  const db = await getDB();
  return [...db.access].sort((a, b) => b.solicitadoEn - a.solicitadoEn);
}

/** Cuenta de solicitudes pendientes (para el badge del admin). */
export async function pendingAccessCount(): Promise<number> {
  const db = await getDB();
  return db.access.filter((a) => a.estado === "pendiente").length;
}

/** Aprueba o rechaza a un usuario. */
export async function setAccess(
  username: string,
  estado: "aprobado" | "rechazado",
  by: string,
): Promise<AccessEntry | null> {
  const u = norm(username);
  return mutate((d) => {
    let entry = d.access.find((a) => norm(a.username) === u);
    if (!entry) {
      entry = { username: username.trim(), estado, solicitadoEn: Date.now() };
      d.access.push(entry);
    } else {
      entry.estado = estado;
    }
    entry.decididoEn = Date.now();
    entry.decididoPor = by;
    // Completa el nombre si lo tenemos en empleados.
    if (!entry.nombre) {
      entry.nombre = d.employees.find((e) => norm(e.username) === u)?.nombre;
    }
    return entry;
  });
}
