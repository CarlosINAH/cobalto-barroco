import DashboardShell from "@/components/dashboard/DashboardShell";
import NubeTabs from "@/components/files/NubeTabs";
import { requireSession } from "@/lib/auth-server";
import { SHARED_ROOT } from "@/lib/shared-files";

export const dynamic = "force-dynamic";

export default async function NubeEmpleado({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireSession();
  const { tab } = await searchParams;

  return (
    <DashboardShell role="empleado" title="Nube">
      <NubeTabs
        personalLabel="Mi carpeta"
        initialTab={tab === "compartidos" ? "compartidos" : "personal"}
        personal={{ rootLabel: "Mi carpeta", canPublish: true }}
        shared={{
          rootLabel: "Compartidos",
          basePath: SHARED_ROOT,
          withMeta: true,
          autoRefreshMs: 180000,
        }}
      />
    </DashboardShell>
  );
}
