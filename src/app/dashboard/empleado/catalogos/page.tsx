import DashboardShell from "@/components/dashboard/DashboardShell";
import EmpleadoCatalogos from "@/components/empleado/EmpleadoCatalogos";
import { requireSession } from "@/lib/auth-server";
import { getDB } from "@/lib/db";
import { buildCatalogs, recipeCost } from "@/lib/pu";

export const dynamic = "force-dynamic";

/** Materiales y recetas en modo lectura para empleados (sin salarios ni P.U.). */
export default async function CatalogosEmpleado() {
  await requireSession();
  const db = await getDB();
  const catalogs = buildCatalogs(db);
  const materiales = db.costMaterials.map((m) => ({
    id: m.id, nombre: m.nombre, kind: m.kind, categoria: m.categoria, precio: m.precio, unidad: m.unidad, url: m.url || "",
  }));
  const recetas = db.recipes.map((r) => ({
    id: r.id, nombre: r.nombre, rendimiento: r.rendimiento, unidad: r.unidad,
    costo: recipeCost(r, catalogs),
    componentes: r.componentes.map((c) => ({ nombre: c.nombre, precio: c.precio, cantidad: c.cantidad })),
  }));
  return (
    <DashboardShell role="empleado" title="Materiales y recetas">
      <EmpleadoCatalogos materiales={materiales} recetas={recetas} />
    </DashboardShell>
  );
}
