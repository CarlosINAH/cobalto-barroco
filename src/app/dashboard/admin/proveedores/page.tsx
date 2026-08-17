import DashboardShell from "@/components/dashboard/DashboardShell";
import ProveedoresManager from "@/components/proveedores/ProveedoresManager";
import { requireAdmin } from "@/lib/auth-server";
import { getDB } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ProveedoresAdmin() {
  await requireAdmin();
  const db = await getDB();
  return (
    <DashboardShell role="admin" title="Proveedores">
      <div className="mb-5">
        <p className="text-[#7A7A7A] text-sm">
          Directorio de proveedores de la empresa: contacto, categoría y notas.
        </p>
      </div>
      <ProveedoresManager initial={db.suppliers} />
    </DashboardShell>
  );
}
