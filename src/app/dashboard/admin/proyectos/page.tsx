import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import ProyectosYPresupuesto from "@/components/proyectos/ProyectosYPresupuesto";
import { getSession, sectionLevel, canWriteSection, editableProjectIds } from "@/lib/auth-server";
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
  const session = await getSession();
  if (!session) redirect("/login");
  const db = await getDB();
  // Acceso: completo (admin o sección "proyectos" habilitada) → ve todas las
  // obras y el armador/catálogo. Editor de proyecto (proyectoEdita) → solo sus
  // obras, con sus hojas (presupuesto, cronograma, administración, nómina…).
  const nivelProy = await sectionLevel(session, "proyectos");
  const full = session.role === "admin" || nivelProy !== "oculto";
  const editables = full ? [] : await editableProjectIds(session);
  if (!full && editables.length === 0) redirect("/dashboard/empleado");
  const puedeTodo = (id: string | null) => full || (!!id && editables.includes(id));
  const projectsVis = full ? db.projects : db.projects.filter((p) => editables.includes(p.id));
  const budgetsVis = full ? db.budgets : db.budgets.filter((b) => puedeTodo(b.projectId));
  const ledgerVis = full ? db.ledgerEntries : db.ledgerEntries.filter((e) => puedeTodo(e.projectId));
  const payrollVis = full ? db.payrollEntries : db.payrollEntries.filter((e) => puedeTodo(e.projectId));
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
    cuadrillaPersonas: c.cuadrillaPersonas,
    cuadrilla: c.cuadrilla,
  }));
  const recetas = db.recipes.map((r) => ({ ...r, costo: recipeCost(r, catalogs) }));

  return (
    <DashboardShell role={session.role} title="Proyectos">
      <ProyectosYPresupuesto
        alcance={full ? "completo" : "editor"}
        proyectos={{
          proyectos: projectsVis,
          budgets: budgetsVis,
          conceptos,
          ledger: ledgerVis,
          payroll: payrollVis,
          empleados: db.employees.map((e) => ({
            id: e.id, nombre: e.nombre, rol: e.rol,
            proyectoIds: e.proyectoIds?.length ? e.proyectoIds : (e.proyectoId ? [e.proyectoId] : []),
            proyectoEdita: e.proyectoEdita || [],
          })),
          catalog: {
            materiales: db.costMaterials,
            recetas,
            salarios: db.laborRates,
            conceptos: conceptosFull,
          },
        }}
        presupuesto={{
          budgets: budgetsVis,
          conceptos: conceptosPick,
          projects: projectsVis,
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
