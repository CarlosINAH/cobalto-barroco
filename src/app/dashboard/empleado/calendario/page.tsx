import DashboardShell from "@/components/dashboard/DashboardShell";
import CalendarManager from "@/components/calendar/CalendarManager";
import { requireSession } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export default async function CalendarioEmpleado() {
  await requireSession();
  return (
    <DashboardShell role="empleado" title="Calendario">
      <CalendarManager />
    </DashboardShell>
  );
}
