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

  // Camino rápido (solo lectura): resuelve sin escribir los casos ya decididos
  // (aprobado con ficha, pendiente o rechazado), que es lo normal en cada login.
  const db = await getDB();
  const current = db.access.find((a) => norm(a.username) === u);
  if (current?.estado === "rechazado") return "rejected";
  if (current?.estado === "pendiente") return "pending";
  if (
    current?.estado === "aprobado" &&
    db.employees.some((e) => norm(e.username) === u)
  ) {
    return "allow";
  }

  // Decisión con escritura (serializada y atómica).
  return mutate((d) => {
    const entry = d.access.find((a) => norm(a.username) === u);
    if (entry?.estado === "rechazado") return "rejected";
    if (entry?.estado === "pendiente") return "pending";

    const now = Date.now();
    const emp = d.employees.find((e) => norm(e.username) === u);

    // Usuario ya conocido (empleado del roster inicial o con registro de acceso
    // previo): conserva su acceso. Así nadie que ya usaba la plataforma queda
    // bloqueado al introducir la aprobación por administrador.
    if (emp || entry) {
      let e = emp;
      if (!e) {
        e = {
          id: newId("EMP"),
          username: username.trim(),
          nombre: entry?.nombre || username.trim(),
          email: "",
          telefono: "",
          rol: "",
          ranking: 0,
          habilidades: [],
          cualidades: [],
          proyectoId: null,
          createdAt: now,
        };
        d.employees.push(e);
      }
      if (!entry) {
        d.access.push({
          username: username.trim(),
          nombre: e.nombre,
          estado: "aprobado",
          solicitadoEn: now,
          decididoEn: now,
          decididoPor: "sistema",
        });
      } else if (entry.estado !== "aprobado") {
        entry.estado = "aprobado";
        entry.decididoEn = now;
        entry.decididoPor = "sistema";
        if (!entry.nombre) entry.nombre = e.nombre;
      }
      return "allow";
    }

    // Usuario nuevo del NAS: queda PENDIENTE hasta que un administrador lo
    // apruebe en "Accesos". Su ficha de empleado se crea al aprobarlo.
    d.access.push({
      username: username.trim(),
      nombre: username.trim(),
      estado: "pendiente",
      solicitadoEn: now,
    });
    return "pending";
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
    // Al aprobar, asegura su ficha de empleado para que aparezca en "Personal".
    if (estado === "aprobado") {
      let emp = d.employees.find((e) => norm(e.username) === u);
      if (!emp) {
        emp = {
          id: newId("EMP"),
          username: username.trim(),
          nombre: entry.nombre || username.trim(),
          email: "",
          telefono: "",
          rol: "",
          ranking: 0,
          habilidades: [],
          cualidades: [],
          proyectoId: null,
          createdAt: Date.now(),
        };
        d.employees.push(emp);
      }
      if (!entry.nombre) entry.nombre = emp.nombre;
    }
    return entry;
  });
}
