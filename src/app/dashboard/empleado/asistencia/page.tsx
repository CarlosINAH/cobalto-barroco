import DashboardShell from "@/components/dashboard/DashboardShell";
import Asistencia from "@/components/asistencia/Asistencia";
import { requireSession } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export default async function AsistenciaEmpleado() {
  await requireSession();
  return (
    <DashboardShell role="empleado" title="Asistencia">
      <Asistencia />
    </DashboardShell>
  );
}
