import DashboardShell from "@/components/dashboard/DashboardShell";
import ProyectosYPresupuesto from "@/components/proyectos/ProyectosYPresupuesto";
import { requireSectionView, sectionLevel, canWriteSection } from "@/lib/auth-server";
import { getDB } from "@/lib/db";
import { buildCatalogs, recipeCost, conceptBreakdown } from "@/lib/pu";

export const dynamic = "force-dynamic";

/**
 * Sección Proyectos. Dos submenús:
 * - Proyectos activos: obras en curso con sus hojas (presupuesto, cronograma,
 *   administración, nómina, balance).
 * - Presupuesto: armador de cotizaciones + catálogos (materiales, salarios,
 *   recetas, conceptos/costos unitarios). Al aprobar, el presupuesto se vuelve
 *   proyecto activo.
 * Acceso: admin, o quien tenga la sección "proyectos" habilitada (lectura/total)
 * en Configuración.
 */
export default async function ProyectosAdmin() {
  const session = await requireSectionView("proyectos");
  const db = await getDB();
  const catalogs = buildCatalogs(db);

  // Currículum concatenado a Proyectos: solo si el usuario tiene la sección "cv".
  const cvLevel = await sectionLevel(session, "cv");
  const cv = cvLevel === "oculto"
    ? null
    : {
        initial: [...db.cvEntries].sort((a, b) => b.anio - a.anio),
        canWrite: await canWriteSection(session, "cv"),
      };

  const conceptosFull = db.concepts.map((c) => {
    const b = conceptBreakdown(c, catalogs);
    return { ...c, costoDirecto: b.costoDirecto, pu: b.pu, porTipo: b.porTipo };
  });
  // Conceptos con desglose para ProyectosManager (balance).
  const conceptos = conceptosFull.map((c) => ({
    id: c.id, clave: c.clave, concepto: c.concepto, descripcion: c.descripcion,
    unidad: c.unidad, pu: c.pu, tiempoPU: c.tiempoPU ?? null, porTipo: c.porTipo,
  }));
  // Lista ligera para el selector del armador de presupuesto.
  const conceptosPick = conceptosFull.map((c) => ({
    id: c.id, clave: c.clave, concepto: c.concepto, descripcion: c.descripcion,
    unidad: c.unidad, pu: c.pu, tiempoPU: c.tiempoPU ?? null,
    materialIntervencion: c.materialIntervencion,
  }));
  const recetas = db.recipes.map((r) => ({ ...r, costo: recipeCost(r, catalogs) }));

  return (
    <DashboardShell role={session.role} title="Proyectos">
      <ProyectosYPresupuesto
        proyectos={{
          proyectos: db.projects,
          budgets: db.budgets,
          conceptos,
          ledger: db.ledgerEntries,
          payroll: db.payrollEntries,
          empleados: db.employees.map((e) => ({
            id: e.id, nombre: e.nombre, rol: e.rol,
            proyectoIds: e.proyectoIds?.length ? e.proyectoIds : (e.proyectoId ? [e.proyectoId] : []),
          })),
          catalog: {
            materiales: db.costMaterials,
            recetas,
            salarios: db.laborRates,
            conceptos: conceptosFull,
          },
        }}
        presupuesto={{
          budgets: db.budgets,
          conceptos: conceptosPick,
          projects: db.projects,
          catalog: {
            materiales: db.costMaterials,
            recetas,
            salarios: db.laborRates,
            conceptos: conceptosFull,
          },
        }}
        cv={cv}
      />
    </DashboardShell>
  );
}
