import DashboardShell from "@/components/dashboard/DashboardShell";
import { requireAdmin } from "@/lib/auth-server";
import { Construction } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function FichasAdmin() {
  await requireAdmin();
  return (
    <DashboardShell role="admin" title="Fichas de bienes muebles">
      <EnConstruccion />
    </DashboardShell>
  );
}

function EnConstruccion() {
  return (
    <div className="bg-white border border-[#EDE9E0] py-20 px-6 text-center max-w-xl mx-auto">
      <Construction size={32} className="mx-auto mb-4 text-[#C9A84C]" />
      <h2 className="text-[#1B2A5E] text-xl mb-2" style={{ fontFamily: "var(--font-playfair)" }}>
        Sección en construcción
      </h2>
      <p className="text-sm text-[#7A7A7A]">
        Aquí se registrarán las fichas de los bienes muebles. Está pendiente
        definir los machotes de ficha por tipo de bien (madera, metal,
        escultura, etc.); en cuanto los tengamos, habilitamos el registro.
      </p>
    </div>
  );
}
