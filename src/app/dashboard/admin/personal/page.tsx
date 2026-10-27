import { redirect } from "next/navigation";

/**
 * Personal y permisos se fusionó dentro de Configuración (pestañas Empleados y
 * Permisos de carpetas). Esta ruta queda como redirección para no romper
 * enlaces antiguos.
 */
export default function PersonalAdmin() {
  redirect("/dashboard/admin/configuracion");
}
