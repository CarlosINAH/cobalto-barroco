import DashboardShell from "@/components/dashboard/DashboardShell";
import Link from "next/link";
import { requireSession } from "@/lib/auth-server";
import { getDB } from "@/lib/db";
import { MapPin, Calendar, Users, BookOpen } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProyectoEmpleado() {
  const session = await requireSession();
  const db = await getDB();
  const emp = db.employees.find(
    (e) => e.username.toLowerCase() === session.username.toLowerCase(),
  );
  const proyecto = emp?.proyectoId
    ? db.projects.find((p) => p.id === emp.proyectoId)
    : null;
  const compañeros = proyecto
    ? db.employees.filter(
        (e) => e.proyectoId === proyecto.id && e.username !== emp?.username,
      )
    : [];

  return (
    <DashboardShell role="empleado" title="Proyecto asignado">
      {!proyecto ? (
        <div className="bg-white border border-[#EDE9E0] py-20 text-center text-[#7A7A7A] text-sm">
          Todavía no tienes un proyecto asignado. La administración te asignará a uno.
        </div>
      ) : (
        <>
          <div className="bg-white border border-[#EDE9E0] p-6 mb-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="text-[#7A7A7A] text-xs font-mono">{proyecto.id}</span>
                <h2 className="text-[#1B2A5E] text-2xl mt-1" style={{ fontFamily: "var(--font-playfair)" }}>
                  {proyecto.nombre}
                </h2>
                {proyecto.desc && <p className="text-[#7A7A7A] text-sm mt-2 max-w-xl">{proyecto.desc}</p>}
                <div className="flex flex-wrap gap-4 text-[#7A7A7A] text-xs mt-3">
                  {proyecto.ubicacion && (
                    <span className="flex items-center gap-1"><MapPin size={12} />{proyecto.ubicacion}</span>
                  )}
                  {(proyecto.inicio || proyecto.entrega) && (
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />{proyecto.inicio || "—"} → {proyecto.entrega || "—"}
                    </span>
                  )}
                  <span className="flex items-center gap-1"><Users size={12} />{compañeros.length + 1} en el equipo</span>
                </div>
              </div>
              <div className="text-center">
                <p className="text-[#C9A84C] text-3xl font-bold" style={{ fontFamily: "var(--font-playfair)" }}>
                  {proyecto.avance}%
                </p>
                <p className="text-[#7A7A7A] text-xs uppercase tracking-wider">Avance</p>
              </div>
            </div>
            <div className="mt-4 h-1.5 bg-[#EDE9E0]">
              <div className="h-1.5 bg-gradient-to-r from-[#1B2A5E] to-[#C9A84C]" style={{ width: `${proyecto.avance}%` }} />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="bg-white border border-[#EDE9E0] p-5">
              <h3 className="text-[#1B2A5E] font-semibold mb-3">Equipo del proyecto</h3>
              {compañeros.length === 0 ? (
                <p className="text-[#7A7A7A] text-sm">Solo tú por ahora.</p>
              ) : (
                <ul className="space-y-2">
                  {compañeros.map((c) => (
                    <li key={c.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#1B2A5E] flex items-center justify-center shrink-0">
                        <span className="text-[#C9A84C] text-xs font-bold">
                          {c.nombre.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[#2C2C2C] text-sm truncate">{c.nombre}</p>
                        {c.rol && <p className="text-[#7A7A7A] text-xs truncate">{c.rol}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="bg-white border border-[#EDE9E0] p-5 flex flex-col justify-center items-center text-center">
              <BookOpen size={24} className="text-[#C9A84C] mb-2" />
              <p className="text-[#7A7A7A] text-sm mb-3">
                Sube documentos y fotos de tu trabajo a tu repositorio.
              </p>
              <Link
                href="/dashboard/empleado/repositorio"
                className="bg-[#1B2A5E] text-[#F5F2EC] px-4 py-2 text-xs tracking-widest uppercase font-semibold hover:bg-[#243470]"
              >
                Ir a mi repositorio
              </Link>
            </div>
          </div>
        </>
      )}
    </DashboardShell>
  );
}
