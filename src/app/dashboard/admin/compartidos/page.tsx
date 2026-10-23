import { redirect } from "next/navigation";

// "Archivos compartidos" ahora es una pestaña dentro de la Nube.
export default function CompartidosAdminRedirect() {
  redirect("/dashboard/admin/nas?tab=compartidos");
}
