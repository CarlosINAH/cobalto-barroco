import DashboardShell from "@/components/dashboard/DashboardShell";
import GastosManager from "@/components/gastos/GastosManager";
import { requireAdmin } from "@/lib/auth-server";
import { getDB } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Gastos de la empresa y por proyecto (hojas de egresos del Excel). Solo admin. */
export default async function GastosAdmin() {
  await requireAdmin();
  const db = await getDB();
  return (
    <DashboardShell role="admin" title="Gastos">
      <GastosManager
        initial={db.ledgerEntries.filter((e) => e.tipo === "egreso")}
        proyectos={db.projects.map((p) => ({ id: p.id, nombre: p.nombre }))}
      />
    </DashboardShell>
  );
}
