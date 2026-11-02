import DashboardShell from "@/components/dashboard/DashboardShell";
import BitacoraManager, { type MovRow } from "@/components/bitacora/BitacoraManager";
import { requireAdmin } from "@/lib/auth-server";
import { getDB } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Bitácora de movimientos (solo administración): auditoría de acciones. */
export default async function BitacoraAdmin() {
  await requireAdmin();
  const db = await getDB();
  const projById = new Map(db.projects.map((p) => [p.id, p.nombre]));
  // Más recientes primero, acotado para no cargar de más.
  const movimientos: MovRow[] = [...(db.movimientos ?? [])]
    .reverse()
    .slice(0, 1000)
    .map((m) => ({
      id: m.id, ts: m.ts, actor: m.actor, actorNombre: m.actorNombre,
      accion: m.accion, entidad: m.entidad, entidadId: m.entidadId,
      descripcion: m.descripcion, projectId: m.projectId ?? null,
      proyectoNombre: m.projectId ? (projById.get(m.projectId) || "—") : "Empresa",
    }));

  return (
    <DashboardShell role="admin" title="Bitácora">
      <div className="mb-5">
        <p className="text-[#7A7A7A] text-sm">
          Registro de movimientos: quién hizo qué y cuándo en la plataforma.
        </p>
      </div>
      <BitacoraManager movimientos={movimientos} />
    </DashboardShell>
  );
}
