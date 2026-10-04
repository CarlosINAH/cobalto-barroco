import "server-only";
import { getDB, mutate, newId, type AccessEntry } from "@/lib/db";
import { isAdmin } from "@/lib/session";

export type AccessDecision = "allow" | "pending" | "rejected";

function norm(u: string): string {
  return u.trim().toLowerCase();
}

/**
 * Decide si un usuario del NAS puede usar la plataforma. Esta función se llama
 * DESPUÉS de que el NAS valida las credenciales (ver `api/login`), así que llegar
 * aquí ya prueba que el NAS autorizó la cuenta. El NAS es la fuente de verdad:
 * cualquier usuario válido queda dado de alta automáticamente (acceso aprobado +
 * ficha de empleado básica) sin necesidad de aprobación manual. La única excepción
 * es un rechazo explícito del admin, que sigue vetando a esa persona en concreto.
 */
export async function evaluateAccess(username: string): Promise<AccessDecision> {
  if (isAdmin(username)) return "allow";
  const u = norm(username);

  // Camino rápido (solo lectura): si ya está aprobado y tiene ficha, no hay nada
  // que escribir. Evita una escritura en disco en cada login de alguien ya dado
  // de alta, que es el caso normal.
  const db = await getDB();
  const current = db.access.find((a) => norm(a.username) === u);
  if (current?.estado === "rechazado") return "rejected";
  if (
    current?.estado === "aprobado" &&
    db.employees.some((e) => norm(e.username) === u)
  ) {
    return "allow";
  }

  // Alta o actualización automática, serializada y atómica.
  return mutate((d) => {
    const entry = d.access.find((a) => norm(a.username) === u);

    // Veto explícito del admin: sigue bloqueando aunque exista en el NAS.
    if (entry?.estado === "rechazado") return "rejected";

    const now = Date.now();

    // Alta automática de la ficha de empleado la primera vez que entra.
    let emp = d.employees.find((e) => norm(e.username) === u);
    if (!emp) {
      emp = {
        id: newId("EMP"),
        username: username.trim(),
        nombre: username.trim(),
        email: "",
        telefono: "",
        rol: "",
        ranking: 0,
        habilidades: [],
        cualidades: [],
        proyectoId: null,
        createdAt: now,
      };
      d.employees.push(emp);
    }

    // Registro de acceso aprobado (lo crea o lo actualiza desde "pendiente").
    if (!entry) {
      d.access.push({
        username: username.trim(),
        nombre: emp.nombre,
        estado: "aprobado",
        solicitadoEn: now,
        decididoEn: now,
        decididoPor: "sistema",
      });
    } else if (entry.estado !== "aprobado") {
      entry.estado = "aprobado";
      entry.decididoEn = now;
      entry.decididoPor = "sistema";
      if (!entry.nombre) entry.nombre = emp.nombre;
    }

    return "allow";
  });
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
