"use client";

import { useState } from "react";
import { FolderKanban, ClipboardList, Layers, Award } from "lucide-react";
import ProyectosManager from "@/components/proyectos/ProyectosManager";
import PresupuestoManager from "@/components/presupuesto/PresupuestoManager";
import CatalogosManager from "@/components/costos/CatalogosManager";
import CVManager from "@/components/cv/CVManager";

type ProyProps = React.ComponentProps<typeof ProyectosManager>;
type PresProps = React.ComponentProps<typeof PresupuestoManager>;
type CVProps = React.ComponentProps<typeof CVManager>;
type Tab = "activos" | "presupuesto" | "catalogo" | "cv";

/**
 * Sección Proyectos con submenús: "Proyectos" (obras con sus hojas),
 * "Presupuesto" (armador de cotizaciones), "Catálogo" (costos unitarios,
 * materiales, salarios, recetas) y "Currículum" (participación de la empresa
 * en proyectos). El Currículum solo aparece a quien tenga permiso de esa
 * sección.
 */
export default function ProyectosYPresupuesto({
  proyectos, presupuesto, cv, alcance = "completo",
}: {
  proyectos: ProyProps;
  presupuesto: PresProps;
  cv: CVProps | null;
  /** "editor": el residente ve solo sus obras (sin armador suelto ni catálogo). */
  alcance?: "completo" | "editor";
}) {
  const [tab, setTab] = useState<Tab>("activos");
  const editor = alcance === "editor";

  const tabs = editor
    ? ([["activos", "Proyectos", FolderKanban]] as const)
    : ([
        ["activos", "Proyectos", FolderKanban],
        ["presupuesto", "Presupuesto", ClipboardList],
        ["catalogo", "Catálogo", Layers],
        ...(cv ? [["cv", "Currículum", Award] as const] : []),
      ] as const);

  return (
    <div>
      <div className="flex gap-1 border-b border-[#EDE9E0] mb-6 overflow-x-auto">
        {tabs.map(([id, label, Icon]) => {
          const on = tab === id;
          return (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs tracking-wider uppercase font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors ${on ? "border-[#C9A84C] text-[#1B2A5E]" : "border-transparent text-[#7A7A7A] hover:text-[#1B2A5E]"}`}>
              <Icon size={14} /> {label}
            </button>
          );
        })}
      </div>

      {tab === "activos" && <ProyectosManager {...proyectos} alcance={alcance} />}
      {tab === "presupuesto" && <PresupuestoManager {...presupuesto} />}
      {tab === "catalogo" && <CatalogosManager {...presupuesto.catalog} />}
      {tab === "cv" && cv && <CVManager {...cv} />}
    </div>
  );
}
