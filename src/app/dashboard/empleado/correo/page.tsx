import DashboardShell from "@/components/dashboard/DashboardShell";
import Mensajes from "@/components/mensajes/Mensajes";
import { requireSession } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export default async function CorreoEmpleado() {
  const session = await requireSession();
  return (
    <DashboardShell role="empleado" title="Mensajes">
      <p className="text-[#7A7A7A] text-sm mb-5">
        Comunícate con la administración y tu equipo; los mensajes llegan también al correo.
      </p>
      <Mensajes me={session.username} />
    </DashboardShell>
  );
}
