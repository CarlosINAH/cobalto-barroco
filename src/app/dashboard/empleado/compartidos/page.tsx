import { redirect } from "next/navigation";

// "Archivos compartidos" ahora es una pestaña dentro de la Nube.
export default function CompartidosEmpleadoRedirect() {
  redirect("/dashboard/empleado/repositorio?tab=compartidos");
}
