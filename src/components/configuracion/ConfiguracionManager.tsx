"use client";

import { useState } from "react";
import { ShieldCheck, Users, FolderLock } from "lucide-react";
import AccesosManager from "@/components/configuracion/AccesosManager";
import PersonalManager from "@/components/personal/PersonalManager";
import PermisosManager from "@/components/permisos/PermisosManager";
import type { Employee } from "@/lib/db";

type Tab = "accesos" | "empleados" | "carpetas";

/**
 * Centro de configuración (solo admin): reúne en un solo lugar los permisos de
 * la plataforma —acceso a secciones por persona (Accesos), alta/edición de
 * empleados (Empleados) y permisos de carpetas compartidas (Carpetas)—.
 */
export default function ConfiguracionManager({
  accesos, personal, permisos,
}: {
  accesos: Employee[];
  personal: React.ComponentProps<typeof PersonalManager>;
  permisos: React.ComponentProps<typeof PermisosManager>;
}) {
  const [tab, setTab] = useState<Tab>("accesos");

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "accesos", label: "Accesos", icon: ShieldCheck },
    { id: "empleados", label: "Empleados", icon: Users },
    { id: "carpetas", label: "Permisos de carpetas", icon: FolderLock },
  ];

  return (
    <div>
      <div className="flex gap-1 border-b border-[#EDE9E0] mb-6 overflow-x-auto">
        {TABS.map((t) => {
          const Icon = t.icon;
          const on = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs tracking-wider uppercase font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors ${on ? "border-[#C9A84C] text-[#1B2A5E]" : "border-transparent text-[#7A7A7A] hover:text-[#1B2A5E]"}`}>
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "accesos" && <AccesosManager initial={accesos} />}
      {tab === "empleados" && <PersonalManager {...personal} />}
      {tab === "carpetas" && <PermisosManager {...permisos} />}
    </div>
  );
}
