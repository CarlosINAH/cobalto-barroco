import DashboardShell from "@/components/dashboard/DashboardShell";
import { Upload, Star, TrendingUp } from "lucide-react";

const habilidades = [
  { nombre: "Dorado al agua", nivel: 95, categoria: "Técnica de acabado" },
  { nombre: "Restauración de madera policromada", nivel: 88, categoria: "Soporte" },
  { nombre: "Consolidación de estratos pictóricos", nivel: 82, categoria: "Conservación" },
  { nombre: "Limpieza de barnices oxidados", nivel: 90, categoria: "Conservación" },
  { nombre: "Reintegración cromática (acuarela)", nivel: 75, categoria: "Reintegración" },
  { nombre: "Documentación fotográfica", nivel: 70, categoria: "Registro" },
  { nombre: "Aplicación de estuco", nivel: 65, categoria: "Soporte" },
  { nombre: "Análisis de materiales históricos", nivel: 60, categoria: "Diagnóstico" },
];

const categorias = [...new Set(habilidades.map((h) => h.categoria))];

export default function HabilidadesEmpleado() {
  return (
    <DashboardShell role="empleado" title="Mis habilidades">
      {/* CV upload banner */}
      <div className="bg-[#1B2A5E] p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <p className="text-[#C9A84C] text-xs tracking-widest uppercase mb-1 font-semibold">
            Perfil de habilidades
          </p>
          <p className="text-[#F5F2EC] text-sm">
            Habilidades extraídas de tu CV ·{" "}
            <span className="text-[#F5F2EC]/50">Última actualización: 15 Ene 2025</span>
          </p>
        </div>
        <button className="flex items-center gap-2 border border-[#C9A84C] text-[#C9A84C] hover:bg-[#C9A84C] hover:text-[#1B2A5E] px-4 py-2.5 text-xs tracking-widest uppercase font-semibold transition-all shrink-0">
          <Upload size={13} /> Actualizar CV
        </button>
      </div>

      {/* Ranking badge */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { icon: Star, label: "Ranking general", value: "#4 de 48", color: "text-[#C9A84C]" },
          { icon: TrendingUp, label: "Habilidades top", value: "Dorado al agua", color: "text-emerald-500" },
          { icon: Star, label: "Categoría fuerte", value: "Acabados", color: "text-blue-400" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white border border-[#EDE9E0] p-5 flex items-center gap-4">
              <Icon size={24} className={s.color} />
              <div>
                <p className="text-[#7A7A7A] text-xs uppercase tracking-wider">{s.label}</p>
                <p
                  className="text-[#1B2A5E] font-semibold text-sm mt-0.5"
                  style={{ fontFamily: "var(--font-playfair)" }}
                >
                  {s.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Skills by category */}
      <div className="space-y-8">
        {categorias.map((cat) => (
          <div key={cat}>
            <p className="text-[#C9A84C] text-xs tracking-widest uppercase font-semibold mb-4">
              {cat}
            </p>
            <div className="space-y-4">
              {habilidades
                .filter((h) => h.categoria === cat)
                .map((h) => (
                  <div key={h.nombre} className="bg-white border border-[#EDE9E0] p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[#2C2C2C] text-sm font-medium">{h.nombre}</span>
                      <span
                        className="text-[#C9A84C] text-sm font-bold"
                        style={{ fontFamily: "var(--font-playfair)" }}
                      >
                        {h.nivel}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-[#EDE9E0]">
                      <div
                        className="h-1.5 bg-gradient-to-r from-[#1B2A5E] to-[#C9A84C] transition-all duration-700"
                        style={{ width: `${h.nivel}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </DashboardShell>
  );
}
