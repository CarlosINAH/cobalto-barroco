import DashboardShell from "@/components/dashboard/DashboardShell";
import NubeTabs from "@/components/files/NubeTabs";
import { requireAdmin, credsForPath } from "@/lib/auth-server";
import { SHARED_ROOT, ensureSharedStructure, withTimeout } from "@/lib/shared-files";

export const dynamic = "force-dynamic";

export default async function NubeAdmin({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await requireAdmin();
  const { tab } = await searchParams;
  // Asegura "Archivos compartidos/{Archivos,Fotos}" (con la cuenta de servicio
  // si está configurada). Con tope de tiempo: si el NAS no responde, la página
  // carga igual y el explorador muestra el aviso en vez de colgarse.
  await withTimeout(ensureSharedStructure(credsForPath(session, SHARED_ROOT)), 2500, false);

  return (
    <DashboardShell role="admin" title="Nube">
      <NubeTabs
        personalLabel="Nube"
        initialTab={tab === "compartidos" ? "compartidos" : "personal"}
        personal={{ rootLabel: "Nube", canPublish: true }}
        shared={{
          rootLabel: "Compartidos",
          basePath: SHARED_ROOT,
          withMeta: true,
          canCreateStructure: true,
          autoRefreshMs: 180000,
        }}
      />
    </DashboardShell>
  );
}
