"use client";

import { useState } from "react";
import { FolderKanban, ChevronRight, ChevronLeft, HardDrive } from "lucide-react";
import NasBrowser from "@/components/nas/NasBrowser";

type Proyecto = { id: string; nombre: string; carpeta: string };

/**
 * Archivos del NAS organizados por proyecto. Cada proyecto tiene su carpeta en
 * el NAS; dentro, "compartido" es lo que ven los empleados. El acceso a un
 * proyecto se controla por asignación (admins ven todos; empleados, los suyos).
 * - admin: navega la carpeta completa del proyecto (incluye lo de administración
 *   un nivel arriba de "compartido").
 * - empleado: solo la subcarpeta "compartido".
 */
export default function NasArchivos({
  role,
  proyectos,
}: {
  role: "admin" | "empleado";
  proyectos: Proyecto[];
}) {
  const [sel, setSel] = useState<Proyecto | null>(null);

  if (proyectos.length === 0) {
    return (
      <div className="bg-white border border-[#EDE9E0] p-6">
        <p className="text-sm text-[#7A7A7A]">
          {role === "admin"
            ? "No hay proyectos con carpeta asignada todavía. Asigna una carpeta del NAS desde un proyecto."
            : "No tienes proyectos asignados con archivos. Pídele a administración que te asigne a un proyecto."}
        </p>
      </div>
    );
  }

  if (sel) {
    const esAdmin = role === "admin";
    const root = esAdmin ? sel.carpeta : `${sel.carpeta}/compartido`;
    return (
      <div className="bg-white border border-[#EDE9E0] p-5">
        <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
          <div>
            <button
              onClick={() => setSel(null)}
              className="flex items-center gap-1 text-xs text-[#7A7A7A] hover:text-[#1B2A5E] mb-1"
            >
              <ChevronLeft size={13} /> Todos los proyectos
            </button>
            <h2 className="text-[#1B2A5E] text-lg flex items-center gap-2" style={{ fontFamily: "var(--font-playfair)" }}>
              <FolderKanban size={18} className="text-[#C9A84C]" /> {sel.nombre}
            </h2>
          </div>
          {!esAdmin && (
            <span className="text-[11px] text-[#7A7A7A] uppercase tracking-wider">Carpeta compartida</span>
          )}
        </div>
        <NasBrowser key={root} root={root} rootLabel={esAdmin ? sel.nombre : "compartido"} canUpload={true} />
      </div>
    );
  }

  return (
    <div>
      <p className="flex items-center gap-1.5 text-sm text-[#7A7A7A] mb-4">
        <HardDrive size={15} className="text-[#C9A84C]" />
        {role === "admin"
          ? "Carpetas de proyectos en el NAS. Entras a la carpeta completa de cada proyecto."
          : "Carpetas compartidas de tus proyectos. Aquí compartes archivos con el equipo."}
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {proyectos.map((p) => (
          <button
            key={p.id}
            onClick={() => setSel(p)}
            className="flex items-center justify-between gap-3 bg-white border border-[#EDE9E0] p-4 text-left hover:border-[#C9A84C] transition-colors"
          >
            <span className="flex items-center gap-2 min-w-0">
              <FolderKanban size={18} className="text-[#C9A84C] shrink-0" />
              <span className="text-sm text-[#2C2C2C] font-medium truncate" title={p.nombre}>{p.nombre}</span>
            </span>
            <ChevronRight size={16} className="text-[#C0BDB8] shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
