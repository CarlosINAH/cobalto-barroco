import DashboardShell from "@/components/dashboard/DashboardShell";
import ConfiguracionManager from "@/components/configuracion/ConfiguracionManager";
import VincularGoogle from "@/components/perfil/VincularGoogle";
import { requireAdmin } from "@/lib/auth-server";
import { getDB } from "@/lib/db";
import { adminUsernames } from "@/lib/session";
import { seedInitialEmployees } from "@/lib/seed";
import { listAccess } from "@/lib/access";

export const dynamic = "force-dynamic";

/**
 * Centro de configuración (solo admin): accesos por persona (qué secciones ve y
 * en qué proyectos participa), solicitudes de acceso y alta de empleados. El rol
 * de administrador se fija en el servidor (ADMIN_USERS); el acceso a archivos se
 * decide por la asignación de proyectos.
 */
export default async function ConfiguracionAdmin() {
  await requireAdmin();
  await seedInitialEmployees();
  const db = await getDB();

  // Solicitudes de acceso pendientes (p. ej. personas que entraron con Google).
  const accessEntries = await listAccess();
  const solicitudes = accessEntries
    .filter((a) => a.estado === "pendiente")
    .map((a) => ({
      username: a.username,
      nombre: a.nombre,
      email: a.email || a.googleEmail,
      via: a.via,
      solicitadoEn: a.solicitadoEn,
    }));

  const projects = db.projects.map((p) => ({ id: p.id, nombre: p.nombre }));

  return (
    <DashboardShell role="admin" title="Configuración">
      <ConfiguracionManager
        accesos={db.employees}
        personal={{ initial: db.employees, projects }}
        projects={projects}
        solicitudes={solicitudes}
        adminUsernames={adminUsernames()}
      />
      <VincularGoogle />
    </DashboardShell>
  );
}
