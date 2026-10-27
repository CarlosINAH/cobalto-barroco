import DashboardShell from "@/components/dashboard/DashboardShell";
import CVManager from "@/components/cv/CVManager";
import { requireSectionView, canWriteSection } from "@/lib/auth-server";
import { getDB } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Currículum de la empresa. Visible para admin o quien tenga la sección "cv"
 * habilitada (lectura/total) en Configuración; solo "total" puede editar.
 */
export default async function CurriculumPage() {
  const session = await requireSectionView("cv");
  const canWrite = await canWriteSection(session, "cv");
  const db = await getDB();
  const entries = [...db.cvEntries].sort((a, b) => b.anio - a.anio);
  return (
    <DashboardShell role={session.role} title="Currículum de la empresa">
      <CVManager initial={entries} canWrite={canWrite} />
    </DashboardShell>
  );
}
