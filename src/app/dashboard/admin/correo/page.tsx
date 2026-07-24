import DashboardShell from "@/components/dashboard/DashboardShell";
import Mensajes from "@/components/mensajes/Mensajes";
import { requireAdmin } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export default async function CorreoAdmin() {
  const session = await requireAdmin();
  return (
    <DashboardShell role="admin" title="Mensajes">
      <p className="text-[#7A7A7A] text-sm mb-5">
        Escribe a los empleados; el mensaje les llega también a su correo.
      </p>
      <Mensajes me={session.username} />
    </DashboardShell>
  );
}
