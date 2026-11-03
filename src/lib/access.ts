import "server-only";
import {
  getDB,
  mutate,
  newId,
  type AccessEntry,
  type Employee,
  type PerfilSistema,
  type SeccionSistema,
  type AccesoNivel,
} from "@/lib/db";
import { isAdmin } from "@/lib/session";

export type AccessDecision = "allow" | "pending" | "rejected" | "inactive";

/**
 * Acceso por sección sugerido según el perfil asignado al aprobar una solicitud.
 * Es un punto de partida razonable; el admin puede afinarlo luego en
 * «Accesos y permisos». restaurador = base (solo su panel de empleado).
 */
export function accesoForPerfil(
  perfil: PerfilSistema | undefined,
): Partial<Record<SeccionSistema, AccesoNivel>> {
  switch (perfil) {
    case "administracion":
      return { administracion: "total", proyectos: "total", cv: "total" };
    case "superintendente":
      return { administracion: "lectura", proyectos: "total", cv: "total" };
    case "residente":
      return { proyectos: "total", cv: "lectura" };
    default:
      return {};
  }
}

export type FileAction = "subir" | "descargar" | "borrar";

/**
 * ¿El usuario puede ejecutar una acción global sobre archivos (subir/descargar/
 * borrar), según la matriz del Excel? Los admins siempre pueden. Sin acciones
 * configuradas (el caso por defecto), se permite todo: así nadie queda bloqueado
 * hasta que un admin restrinja explícitamente. Esta autorización global es
 * independiente (y previa) a los permisos por carpeta.
 */
export async function canDoFileAction(
  username: string,
  role: string,
  action: FileAction,
): Promise<boolean> {
  if (role === "admin") return true;
  const db = await getDB();
  const u = norm(username);
  const emp = db.employees.find((e) => norm(e.username) === u);
  const a = emp?.acciones;
  if (!a) return true; // sin restricción configurada
  return a[action] !== false;
}

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

  // Camino rápido (solo lectura): el rechazo explícito veta; un aprobado con
  // ficha ya está listo. Es lo normal en cada login.
  const db = await getDB();
  const current = db.access.find((a) => norm(a.username) === u);
  // Cuenta desactivada: se niega el acceso aunque exista y esté aprobada.
  const empActual = db.employees.find((e) => norm(e.username) === u);
  if (empActual?.activo === false) return "inactive";
  if (current?.estado === "rechazado") return "rejected";
  if (current?.estado === "aprobado" && empActual) {
    return "allow";
  }

  // Decisión con escritura (serializada y atómica). El NAS ya validó las
  // credenciales, así que cualquier usuario autorizado por el NAS queda dado de
  // alta automáticamente (acceso aprobado + ficha de empleado). La única
  // excepción es un rechazo explícito del admin, que veta a esa persona.
  return mutate((d) => {
    const entry = d.access.find((a) => norm(a.username) === u);
    if (entry?.estado === "rechazado") return "rejected";

    const now = Date.now();
    let emp = d.employees.find((e) => norm(e.username) === u);
    if (!emp) {
      emp = {
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
      d.employees.push(emp);
    }
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
      // Incluye pendientes heredados: al entrar, quedan aprobados sin trámite.
      entry.estado = "aprobado";
      entry.decididoEn = now;
      entry.decididoPor = "sistema";
      if (!entry.nombre) entry.nombre = emp.nombre;
    }
    return "allow";
  });
}

/**
 * Registra (o consulta) la solicitud de acceso de una persona que inició sesión
 * con Google y NO tiene cuenta del NAS. A diferencia del NAS, esta NO se
 * auto-aprueba: queda "pendiente" hasta que un administrador la apruebe desde
 * Configuración → Solicitudes. Se identifica por su correo (username sintético)
 * y se guarda su identidad de Google para poder crear su ficha al aprobar.
 */
export async function requestGoogleAccess(g: {
  sub: string;
  email: string;
  nombre?: string;
}): Promise<{ estado: AccessDecision; nuevo: boolean }> {
  const correo = norm(g.email);
  return mutate((d) => {
    const entry = d.access.find(
      (a) => norm(a.username) === correo || (a.googleSub && a.googleSub === g.sub),
    );
    if (entry) {
      // Mantiene fresca la identidad de Google por si cambió el correo.
      entry.googleSub = g.sub;
      entry.googleEmail = correo;
      if (!entry.email) entry.email = correo;
      if (!entry.via) entry.via = "google";
      if (entry.estado === "rechazado") return { estado: "rejected", nuevo: false };
      if (entry.estado === "aprobado") return { estado: "allow", nuevo: false };
      return { estado: "pending", nuevo: false };
    }
    const now = Date.now();
    d.access.push({
      username: g.email.trim(),
      nombre: g.nombre?.trim() || g.email.trim(),
      estado: "pendiente",
      solicitadoEn: now,
      via: "google",
      googleSub: g.sub,
      googleEmail: correo,
      email: correo,
    });
    return { estado: "pending", nuevo: true };
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

/**
 * Aprueba o rechaza a un usuario. Al aprobar, opcionalmente asigna un `perfil`
 * del sistema (y su acceso por sección sugerido). Para solicitudes de Google,
 * la ficha de empleado se crea con la identidad de Google para que la próxima
 * vez inicie sesión sin trámite.
 */
export async function setAccess(
  username: string,
  estado: "aprobado" | "rechazado",
  by: string,
  perfil?: PerfilSistema,
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
    if (perfil) entry.perfil = perfil;
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
          email: entry.email || "",
          telefono: "",
          rol: "",
          ranking: 0,
          habilidades: [],
          cualidades: [],
          proyectoId: null,
          createdAt: Date.now(),
        } as Employee;
        // Usuario de Google: hereda su identidad para el próximo inicio de sesión.
        if (entry.googleSub) emp.googleSub = entry.googleSub;
        if (entry.googleEmail) emp.googleEmail = entry.googleEmail;
        d.employees.push(emp);
      }
      // Reactiva la cuenta y aplica el perfil/acceso asignado.
      emp.activo = true;
      const perfilFinal = perfil ?? entry.perfil;
      if (perfilFinal) {
        emp.perfil = perfilFinal;
        // Solo siembra el acceso si aún no se ha configurado a mano.
        if (!emp.acceso || Object.keys(emp.acceso).length === 0) {
          emp.acceso = accesoForPerfil(perfilFinal);
        }
      }
      if (!entry.nombre) entry.nombre = emp.nombre;
    }
    return entry;
  });
}
