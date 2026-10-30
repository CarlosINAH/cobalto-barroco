import DashboardShell from "@/components/dashboard/DashboardShell";
import ProximoPagoCard from "@/components/administracion/ProximoPagoCard";
import { requireSession } from "@/lib/auth-server";
import { getDB } from "@/lib/db";
import { Banknote } from "lucide-react";

export const dynamic = "force-dynamic";

const mxn = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 });
const money = (n: number) => mxn.format(Number.isFinite(n) ? n : 0);

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function fechaCorta(iso?: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m) return iso;
  return d ? `${d} ${MESES[m - 1]} ${y}` : `${MESES[m - 1]} ${y}`;
}

/**
 * "Mi nómina": cada empleado ve únicamente sus propios pagos (los que llevan su
 * employeeId o su nombre como persona) y la próxima fecha de pago que fija la
 * administración. No ve la nómina de nadie más ni importes de empresa.
 */
export default async function MiNominaEmpleado() {
  const session = await requireSession();
  const db = await getDB();
  const emp = db.employees.find(
    (e) => e.username.toLowerCase() === session.username.toLowerCase(),
  );
  const nombre = (emp?.nombre || "").trim().toLowerCase();

  const mios = db.payrollEntries
    .filter((e) => (emp && e.employeeId === emp.id) || (!!nombre && e.persona.trim().toLowerCase() === nombre))
    .sort((a, b) => (b.fecha || "").localeCompare(a.fecha || "") || b.createdAt - a.createdAt);

  const proyNombre = (id: string | null) => (id ? db.projects.find((p) => p.id === id)?.nombre || "Proyecto" : "Empresa");
  const pagado = mios.filter((e) => e.pagado).reduce((a, e) => a + e.monto, 0);
  const pendiente = mios.filter((e) => !e.pagado).reduce((a, e) => a + e.monto, 0);

  return (
    <DashboardShell role={session.role} title="Mi nómina">
      <div className="mb-6">
        <h2 className="text-[#1B2A5E] text-2xl" style={{ fontFamily: "var(--font-playfair)" }}>
          Mi nómina
        </h2>
        <p className="text-sm text-[#7A7A7A] mt-1">Tus pagos registrados y la próxima fecha de pago.</p>
      </div>

      <ProximoPagoCard inicial={db.proximoPago ?? null} canEdit={false} />

      <div className="grid gap-4 sm:grid-cols-2 mb-6">
        <div className="bg-white border border-[#EDE9E0] p-4">
          <p className="text-xs uppercase tracking-wider text-[#7A7A7A]">Pagado</p>
          <p className="text-[#1B2A5E] text-xl data-label mt-1" style={{ fontFamily: "var(--font-playfair)" }}>{money(pagado)}</p>
        </div>
        <div className="bg-white border border-[#EDE9E0] p-4">
          <p className="text-xs uppercase tracking-wider text-[#7A7A7A]">Pendiente</p>
          <p className="text-[#C9A84C] text-xl data-label mt-1" style={{ fontFamily: "var(--font-playfair)" }}>{money(pendiente)}</p>
        </div>
      </div>

      {mios.length === 0 ? (
        <div className="bg-white border border-[#EDE9E0] p-8 text-center">
          <Banknote size={28} className="mx-auto text-[#C9A84C] mb-3" />
          <p className="text-sm text-[#7A7A7A]">Aún no tienes pagos registrados.</p>
        </div>
      ) : (
        <div className="bg-white border border-[#EDE9E0] overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#EDE9E0] text-left text-[11px] uppercase tracking-wider text-[#7A7A7A]">
                <th className="px-3 py-2 font-semibold">Fecha</th>
                <th className="px-3 py-2 font-semibold">Periodo</th>
                <th className="px-3 py-2 font-semibold">Proyecto</th>
                <th className="px-3 py-2 font-semibold text-right">Monto</th>
                <th className="px-3 py-2 font-semibold text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5F2EC]">
              {mios.map((e) => (
                <tr key={e.id} className="hover:bg-[#F5F2EC]/50">
                  <td className="px-3 py-2 text-[#2C2C2C] whitespace-nowrap">{fechaCorta(e.fecha)}</td>
                  <td className="px-3 py-2 text-[#555]">{e.periodo || "—"}</td>
                  <td className="px-3 py-2 text-[#555]">{proyNombre(e.projectId)}</td>
                  <td className="px-3 py-2 text-[#2C2C2C] text-right data-label whitespace-nowrap">{money(e.monto)}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`text-[11px] px-2 py-0.5 border ${e.pagado ? "bg-green-50 text-green-700 border-green-200" : "bg-[#C9A84C]/10 text-[#8a7324] border-[#C9A84C]/30"}`}>
                      {e.pagado ? "Pagado" : "Pendiente"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardShell>
  );
}
