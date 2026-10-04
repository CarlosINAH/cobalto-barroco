"use client";

import { useState } from "react";
import {
  Folder,
  Users,
  Lock,
  Check,
  Loader2,
  FolderTree,
} from "lucide-react";

interface Emp {
  username: string;
  nombre: string;
}

export default function PermisosManager({
  folders,
  employees,
  initialShares,
}: {
  folders: { name: string; path: string }[];
  employees: Emp[];
  initialShares: Record<string, string[] | null>;
}) {
  return (
    <>
      <p className="text-[#7A7A7A] text-sm max-w-2xl mb-6">
        Controla qué empleados pueden ver cada carpeta de{" "}
        <b>Archivos compartidos</b>. <b>Todos</b> = visible para todo el equipo;{" "}
        <b>Solo seleccionados</b> = únicamente los empleados que marques (los
        administradores siempre ven todo). Los permisos reales de lectura o
        escritura los sigue imponiendo el NAS.
      </p>

      {folders.length === 0 ? (
        <div className="bg-white border border-[#EDE9E0] py-16 text-center">
          <FolderTree size={32} className="text-[#EDE9E0] mx-auto mb-3" />
          <p className="text-[#7A7A7A] text-sm">
            No hay carpetas en «Archivos compartidos» todavía, o el NAS no
            respondió. Crea subcarpetas en «Archivos Compartidos» para
            administrar su acceso aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {folders.map((f) => (
            <FolderRow
              key={f.path}
              folder={f}
              employees={employees}
              initial={initialShares[f.path] ?? null}
            />
          ))}
        </div>
      )}
    </>
  );
}

function FolderRow({
  folder,
  employees,
  initial,
}: {
  folder: { name: string; path: string };
  employees: Emp[];
  initial: string[] | null;
}) {
  const [everyone, setEveryone] = useState(initial === null);
  const [allowed, setAllowed] = useState<string[]>(initial ?? []);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  // Instantánea de lo último guardado, para saber si hay cambios sin guardar.
  const [baseline, setBaseline] = useState<string>(
    JSON.stringify(initial === null ? null : [...initial].sort()),
  );

  const current = everyone ? null : [...allowed].sort();
  const dirty = JSON.stringify(current) !== baseline;

  const toggle = (u: string) =>
    setAllowed((a) =>
      a.includes(u) ? a.filter((x) => x !== u) : [...a, u],
    );

  const save = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const body = { path: folder.path, allowed: everyone ? null : allowed };
      const res = await fetch("/api/files/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "No se pudo guardar.");
        return;
      }
      setBaseline(JSON.stringify(everyone ? null : [...allowed].sort()));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Error de conexión.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-[#EDE9E0]">
      <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-[#EDE9E0]">
        <div className="flex items-center gap-3 min-w-0">
          <Folder size={18} className="text-[#C9A84C] shrink-0" />
          <div className="min-w-0">
            <p className="text-[#1B2A5E] text-sm font-semibold truncate">
              {folder.name}
            </p>
            <p className="text-[#7A7A7A] text-xs">
              {everyone
                ? "Visible para todos los empleados"
                : `Visible para ${allowed.length} empleado${allowed.length === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>
        <button
          onClick={save}
          disabled={saving || !dirty}
          className="flex items-center gap-2 bg-[#1B2A5E] text-[#F5F2EC] px-4 py-2 text-xs tracking-widest uppercase font-semibold hover:bg-[#243470] disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          {saving ? (
            <Loader2 size={13} className="animate-spin" />
          ) : saved ? (
            <Check size={13} />
          ) : null}
          {saved ? "Guardado" : "Guardar"}
        </button>
      </div>

      <div className="p-5">
        <div className="flex flex-wrap gap-x-6 gap-y-2 mb-4">
          <label className="flex items-center gap-2.5 text-sm text-[#2C2C2C] cursor-pointer">
            <input
              type="radio"
              checked={everyone}
              onChange={() => setEveryone(true)}
              className="accent-[#C9A84C]"
            />
            <Users size={14} className="text-[#7A7A7A]" />
            Todos los empleados
          </label>
          <label className="flex items-center gap-2.5 text-sm text-[#2C2C2C] cursor-pointer">
            <input
              type="radio"
              checked={!everyone}
              onChange={() => setEveryone(false)}
              className="accent-[#C9A84C]"
            />
            <Lock size={14} className="text-[#7A7A7A]" />
            Solo seleccionados
          </label>
        </div>

        {!everyone && (
          <div className="border border-[#EDE9E0] max-h-64 overflow-y-auto">
            {employees.length === 0 ? (
              <p className="text-[#7A7A7A] text-xs p-4">
                No hay empleados registrados.
              </p>
            ) : (
              employees.map((emp) => (
                <label
                  key={emp.username}
                  className="flex items-center gap-2.5 px-4 py-2.5 border-b border-[#EDE9E0] last:border-0 hover:bg-[#F5F2EC] cursor-pointer text-sm"
                >
                  <input
                    type="checkbox"
                    checked={allowed.includes(emp.username)}
                    onChange={() => toggle(emp.username)}
                    className="accent-[#C9A84C]"
                  />
                  <span className="text-[#2C2C2C]">{emp.nombre}</span>
                  <span className="text-[#7A7A7A] text-xs">@{emp.username}</span>
                </label>
              ))
            )}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 px-3 py-2 text-red-600 text-xs mt-3">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
