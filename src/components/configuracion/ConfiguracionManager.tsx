"use client";

import { useState } from "react";
import { ShieldCheck, Users, Upload, UserCheck, Wand2 } from "lucide-react";
import AccesosManager from "@/components/configuracion/AccesosManager";
import PersonalManager from "@/components/personal/PersonalManager";
import SolicitudesAcceso, { type Solicitud } from "@/components/configuracion/SolicitudesAcceso";
import type { Employee } from "@/lib/db";

type Tab = "permisos" | "empleados" | "solicitudes";

/**
 * Centro de configuración (solo admin): reúne en un solo lugar los accesos de la
 * plataforma —en "Accesos y permisos" qué secciones ve cada persona y en qué
 * proyectos participa; en "Empleados" el alta y edición del personal—.
 */
export default function ConfiguracionManager({
  accesos, personal, projects, solicitudes = [], adminUsernames = [],
}: {
  accesos: Employee[];
  personal: React.ComponentProps<typeof PersonalManager>;
  projects?: { id: string; nombre: string }[];
  solicitudes?: Solicitud[];
  adminUsernames?: string[];
}) {
  const [tab, setTab] = useState<Tab>(solicitudes.length > 0 ? "solicitudes" : "permisos");
  const [importing, setImporting] = useState(false);
  const [normalizando, setNormalizando] = useState(false);

  // Revisa el catálogo (vista previa) y, si el admin confirma, lo normaliza:
  // reclasifica familias a categoría+subcategoría, marca duplicados y quita las
  // filas basura (encabezados con precio 0).
  async function onNormalizar() {
    setNormalizando(true);
    try {
      const prev = await fetch("/api/costos/normalizar");
      if (!prev.ok) { alert("No se pudo revisar el catálogo (¿sesión de admin?)."); return; }
      const d = await prev.json();
      const ok = confirm(
        `Revisión del catálogo (${d.total} materiales):\n\n` +
        `• ${d.reclasificados} cambiarán de categoría/subcategoría.\n` +
        `• ${d.duplicados.length} grupos de posibles duplicados se marcarán con nota (no se borran).\n` +
        `• ${d.eliminados.length} filas basura se quitarán (encabezados con precio 0).\n\n` +
        `¿Aplicar la normalización?`,
      );
      if (!ok) return;
      const res = await fetch("/api/costos/normalizar", { method: "POST" });
      if (!res.ok) { alert("No se pudo normalizar."); return; }
      const r = await res.json();
      alert(`Catálogo normalizado: ${r.reclasificados} reclasificados, ${r.eliminados} filas quitadas, ${r.duplicados} grupos de duplicados marcados.`);
      location.reload();
    } catch {
      alert("Error al normalizar el catálogo.");
    } finally {
      setNormalizando(false);
    }
  }

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

  const TABS: { id: Tab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: "permisos", label: "Accesos y permisos", icon: ShieldCheck },
    { id: "empleados", label: "Empleados", icon: Users },
    { id: "solicitudes", label: "Solicitudes", icon: UserCheck, badge: solicitudes.length },
  ];

  return (
    <div>
      <div className="flex justify-end gap-2 mb-3">
        <button
          type="button"
          onClick={onNormalizar}
          disabled={normalizando}
          title="Revisa y ordena el catálogo: categorías/subcategorías, duplicados y filas basura"
          className={`flex items-center gap-2 border border-[#EDE9E0] px-3 py-2 text-xs tracking-wider uppercase font-semibold hover:border-[#C9A84C] ${normalizando ? "opacity-60 pointer-events-none" : "text-[#1B2A5E]"}`}
        >
          <Wand2 size={14} /> {normalizando ? "Revisando…" : "Normalizar catálogo"}
        </button>
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
              {t.badge ? (
                <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#C9A84C] text-white text-[10px] font-bold">
                  {t.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {tab === "permisos" && <AccesosManager initial={accesos} projects={projects} adminUsernames={adminUsernames} />}
      {tab === "empleados" && <PersonalManager {...personal} />}
      {tab === "solicitudes" && <SolicitudesAcceso initial={solicitudes} />}
    </div>
  );
}
