import "server-only";
import { getDB, type PerfilSistema } from "@/lib/db";
import type { Session } from "@/lib/session";

/**
 * Permisos sobre la carpeta de trabajo única (Drive), según la jerarquía de rol.
 * Todos pueden VER y SUBIR; borrar es siempre "a la papelera" salvo el admin,
 * que puede borrar de verdad (vaciar). Crear carpetas lo tienen todos menos el
 * restaurador.
 *
 *  Rol             Ver  Subir  Crear carpeta  Borrar
 *  Administrador    ✓    ✓        ✓            de verdad (papelera + vaciar)
 *  Superintendente  ✓    ✓        ✓            solo a papelera
 *  Residente        ✓    ✓        ✓            solo a papelera
 *  Restaurador      ✓    ✓        ✗            solo a papelera
 */
export interface DriveCaps {
  /** Ver y descargar. */
  ver: boolean;
  /** Subir archivos. */
  subir: boolean;
  /** Crear carpetas y documentos de Google. */
  crearCarpeta: boolean;
  /** Mandar a la papelera (recuperable). */
  papelera: boolean;
  /** Vaciar la papelera / borrar definitivamente (solo admin). */
  borrarReal: boolean;
}

/** Capacidades a partir del perfil y si la sesión es admin. */
export function driveCapsFor(perfil: PerfilSistema | undefined, esAdmin: boolean): DriveCaps {
  if (esAdmin || perfil === "administracion") {
    return { ver: true, subir: true, crearCarpeta: true, papelera: true, borrarReal: true };
  }
  const base: DriveCaps = {
    ver: true,
    subir: true,
    crearCarpeta: false,
    papelera: true,
    borrarReal: false,
  };
  if (perfil === "superintendente" || perfil === "residente") base.crearCarpeta = true;
  return base;
}

/** Resuelve las capacidades del usuario actual (busca su perfil por username). */
export async function drivePermsForSession(session: Session): Promise<DriveCaps> {
  const esAdmin = session.role === "admin";
  const db = await getDB();
  const u = session.username.trim().toLowerCase();
  const emp = db.employees.find((e) => e.username.trim().toLowerCase() === u);
  return driveCapsFor(emp?.perfil, esAdmin);
}
