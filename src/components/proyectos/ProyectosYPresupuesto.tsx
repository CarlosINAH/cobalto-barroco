"use client";

import { useState } from "react";
import { FolderKanban, ClipboardList } from "lucide-react";
import ProyectosManager from "@/components/proyectos/ProyectosManager";
import PresupuestoManager from "@/components/presupuesto/PresupuestoManager";

type ProyProps = React.ComponentProps<typeof ProyectosManager>;
type PresProps = React.ComponentProps<typeof PresupuestoManager>;

/**
 * Sección Proyectos con dos submenús: "Proyectos activos" (obras en curso con
 * sus hojas) y "Presupuesto" (armador + catálogos: costos unitarios,
 * materiales, salarios, recetas). Al aprobar un presupuesto se vuelve proyecto.
 */
export default function ProyectosYPresupuesto({
  proyectos, presupuesto,
}: {
  proyectos: ProyProps;
  presupuesto: PresProps;
}) {
  const [tab, setTab] = useState<"activos" | "presupuesto">("activos");

  return (
    <div>
      <div className="flex gap-1 border-b border-[#EDE9E0] mb-6">
        {([["activos", "Proyectos activos", FolderKanban], ["presupuesto", "Presupuesto", ClipboardList]] as const).map(([id, label, Icon]) => {
          const on = tab === id;
          return (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs tracking-wider uppercase font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors ${on ? "border-[#C9A84C] text-[#1B2A5E]" : "border-transparent text-[#7A7A7A] hover:text-[#1B2A5E]"}`}>
              <Icon size={14} /> {label}
            </button>
          );
        })}
      </div>

      {tab === "activos" ? <ProyectosManager {...proyectos} /> : <PresupuestoManager {...presupuesto} />}
    </div>
  );
}
