import DashboardShell from "@/components/dashboard/DashboardShell";
import { requireSession } from "@/lib/auth-server";
import { Construction } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function FichasEmpleado() {
  await requireSession();
  return (
    <DashboardShell role="empleado" title="Fichas de bienes muebles">
      <div className="bg-white border border-[#EDE9E0] py-20 px-6 text-center max-w-xl mx-auto">
        <Construction size={32} className="mx-auto mb-4 text-[#C9A84C]" />
        <h2 className="text-[#1B2A5E] text-xl mb-2" style={{ fontFamily: "var(--font-playfair)" }}>
          Sección en construcción
        </h2>
        <p className="text-sm text-[#7A7A7A]">
          Pronto podrás registrar aquí las fichas de los bienes muebles. Estamos
          preparando los formatos de ficha por tipo de pieza.
        </p>
      </div>
    </DashboardShell>
  );
}
