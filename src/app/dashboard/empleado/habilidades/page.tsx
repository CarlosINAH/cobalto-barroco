import DashboardShell from "@/components/dashboard/DashboardShell";
import { requireSession } from "@/lib/auth-server";
import { getDB } from "@/lib/db";
import { Star, Award } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HabilidadesEmpleado() {
  const session = await requireSession();
  const db = await getDB();
  const emp = db.employees.find(
    (e) => e.username.toLowerCase() === session.username.toLowerCase(),
  );

  return (
    <DashboardShell role="empleado" title="Mis habilidades">
      <div className="grid gap-6 md:grid-cols-3">
        <div className="bg-[#1B2A5E] text-[#F5F2EC] p-6 flex flex-col items-center justify-center text-center">
          <Award size={28} className="text-[#C9A84C] mb-2" />
          <p className="text-[#C9A84C] text-4xl font-bold" style={{ fontFamily: "var(--font-playfair)" }}>
            {emp?.ranking ?? 0}
          </p>
          <p className="text-[#F5F2EC]/60 text-xs uppercase tracking-wider mt-1">Ranking</p>
        </div>

        <div className="md:col-span-2 bg-white border border-[#EDE9E0] p-6">
          <h3 className="text-[#1B2A5E] font-semibold mb-4 flex items-center gap-2">
            <Star size={16} className="text-[#C9A84C]" /> Especialidades
          </h3>
          {!emp || emp.habilidades.length === 0 ? (
            <p className="text-[#7A7A7A] text-sm">
              Aún no tienes habilidades registradas. La administración las
              asigna desde tu ficha en Personal.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {emp.habilidades.map((h) => (
                <span
                  key={h}
                  className="bg-[#F5F2EC] border border-[#C9A84C]/30 text-[#1B2A5E] text-sm px-3 py-1.5"
                >
                  {h}
                </span>
              ))}
            </div>
          )}
          {emp?.rol && (
            <p className="text-[#7A7A7A] text-sm mt-5 pt-4 border-t border-[#EDE9E0]">
              <span className="text-[#7A7A7A] text-xs uppercase tracking-wider">Rol</span>
              <br />
              {emp.rol}
            </p>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
