import DashboardShell from "@/components/dashboard/DashboardShell";
import SolicitudMaterial from "@/components/materiales/SolicitudMaterial";
import { requireSession } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export default async function MaterialesEmpleado() {
  await requireSession();
  return (
    <DashboardShell role="empleado" title="Solicitud de material">
      <SolicitudMaterial />
    </DashboardShell>
  );
}
