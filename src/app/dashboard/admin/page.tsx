import DashboardShell from "@/components/dashboard/DashboardShell";
import Link from "next/link";
import SolicitudesPendientes from "@/components/panel/SolicitudesPendientes";
import { requireAdmin } from "@/lib/auth-server";
import { getDB } from "@/lib/db";
import { FolderKanban, ClipboardList, Banknote, Package, Users, Award, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

const mxn = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

export default async function PanelAdmin() {
  await requireAdmin();
  const db = await getDB();

  const pendientes = db.materials.filter((m) => m.estado === "pendiente");
  const activos = db.projects.filter((p) => p.estado === "activo").length;
  const finalizados = db.projects.filter((p) => p.estado === "finalizado").length;
  const futuros = db.projects.filter((p) => p.estado === "futuro").length;
  const presupPend = db.budgets.filter((b) => {
    const e = b.estado || "borrador";
    return e === "borrador" || e === "enviado";
  }).length;
  const nominaPorPagar = db.payrollEntries.filter((e) => !e.pagado).reduce((a, e) => a + e.monto, 0);

  const stats = [
    { label: "Proyectos activos", value: String(activos), sub: `${finalizados} finalizados · ${futuros} en proceso`, href: "/dashboard/admin/proyectos", icon: FolderKanban },
    { label: "Presupuestos por aprobar", value: String(presupPend), sub: "borradores + enviados", href: "/dashboard/admin/proyectos", icon: ClipboardList },
    { label: "Nómina por pagar", value: mxn.format(nominaPorPagar), sub: "pendiente de pago", href: "/dashboard/admin/administracion", icon: Banknote },
    { label: "Solicitudes de material", value: String(pendientes.length), sub: "pendientes de autorizar", href: "/dashboard/admin", icon: Package },
    { label: "Empleados", value: String(db.employees.length), sub: "registrados", href: "/dashboard/admin/personal", icon: Users },
    { label: "Currículum", value: String(db.cvEntries.length), sub: "intervenciones", href: "/dashboard/admin/cv", icon: Award },
  ];

  return (
    <DashboardShell role="admin" title="Panel general">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.label} href={s.href}
              className="bg-white border border-[#EDE9E0] p-5 hover:border-[#C9A84C]/50 transition-colors group">
              <div className="flex items-center justify-between mb-2">
                <Icon size={18} className="text-[#C9A84C]" />
                <ArrowRight size={14} className="text-[#EDE9E0] group-hover:text-[#C9A84C]" />
              </div>
              <p className="text-[#1B2A5E] text-3xl font-bold data-label" style={{ fontFamily: "var(--font-playfair)" }}>{s.value}</p>
              <p className="text-[#7A7A7A] text-xs uppercase tracking-wider mt-1">{s.label}</p>
              {s.sub && <p className="text-[#9A968E] text-[11px] mt-0.5">{s.sub}</p>}
            </Link>
          );
        })}
      </div>

      <div>
        <h2 className="text-[#1B2A5E] text-lg mb-3" style={{ fontFamily: "var(--font-playfair)" }}>
          Solicitudes de material pendientes
        </h2>
        <SolicitudesPendientes initial={pendientes} />
      </div>
    </DashboardShell>
  );
}
