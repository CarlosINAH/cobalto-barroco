import DashboardShell from "@/components/dashboard/DashboardShell";
import CalendarManager from "@/components/calendar/CalendarManager";
import GoogleCalendarConexion from "@/components/calendar/GoogleCalendarConexion";
import { requireAdmin } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export default async function CalendarioAdmin() {
  await requireAdmin();
  return (
    <DashboardShell role="admin" title="Calendario">
      <GoogleCalendarConexion />
      <CalendarManager />
    </DashboardShell>
  );
}
