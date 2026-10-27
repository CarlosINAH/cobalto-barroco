"use client";

import { useState } from "react";
import { ShieldCheck, Users, FolderLock, Upload } from "lucide-react";
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
  const [importing, setImporting] = useState(false);

  // Único botón de importación de datos (catálogos + administración). Se quita
  // una vez subida toda la información.
  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!confirm("Importará los datos del archivo (catálogos, obras, gastos y nómina). ¿Continuar?")) return;
    setImporting(true);
    try {
      const json = JSON.parse(await file.text());
      const res = await fetch("/api/costos/import", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...json, mode: "admin" }),
      });
      if (!res.ok) { alert("No se pudo importar (¿sesión de admin?)."); return; }
      const d = await res.json();
      alert(`Importado: ${JSON.stringify(d.importado)}`);
      location.reload();
    } catch {
      alert("El archivo no es un JSON válido.");
    } finally {
      setImporting(false);
    }
  }

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "accesos", label: "Accesos", icon: ShieldCheck },
    { id: "empleados", label: "Empleados", icon: Users },
    { id: "carpetas", label: "Permisos de carpetas", icon: FolderLock },
  ];

  return (
    <div>
      <div className="flex justify-end mb-3">
        <label className={`flex items-center gap-2 border border-[#EDE9E0] px-3 py-2 text-xs tracking-wider uppercase font-semibold cursor-pointer hover:border-[#C9A84C] ${importing ? "opacity-60 pointer-events-none" : "text-[#1B2A5E]"}`}>
          <Upload size={14} /> {importing ? "Importando…" : "Importar datos (JSON)"}
          <input type="file" accept="application/json,.json" className="hidden" onChange={onImport} />
        </label>
      </div>
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
