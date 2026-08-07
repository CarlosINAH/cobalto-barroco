import DashboardShell from "@/components/dashboard/DashboardShell";
import ConfiguracionEmpleado from "@/components/perfil/ConfiguracionEmpleado";
import { requireSession } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export default async function ConfiguracionEmpleadoPage() {
  await requireSession();
  return (
    <DashboardShell role="empleado" title="Configuración">
      <div className="mb-5">
        <p className="text-[#7A7A7A] text-sm">
          Actualiza tus datos de contacto y consulta cómo cambiar tu contraseña.
        </p>
      </div>
      <ConfiguracionEmpleado />
    </DashboardShell>
  );
}
