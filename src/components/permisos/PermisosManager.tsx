"use client";

import { useMemo, useState } from "react";
import {
  Folder,
  Check,
  Loader2,
  FolderTree,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Pencil,
  Eye,
  EyeOff,
  Users,
} from "lucide-react";
import type { FolderPermLevel } from "@/lib/db";
import type { FolderPerms } from "@/app/dashboard/admin/permisos/page";

interface Emp {
  username: string;
  nombre: string;
}

const LEVELS: FolderPermLevel[] = ["total", "escritura", "lectura", "none"];

const LEVEL_LABEL: Record<FolderPermLevel, string> = {
  total: "Acceso total",
  escritura: "Lectura y escritura",
  lectura: "Solo lectura",
  none: "Sin acceso",
};

function initials(nombre: string, username: string): string {
  return (nombre || username)
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function PermisosManager({
  folders,
  employees,
  initial,
}: {
  folders: { name: string; path: string }[];
  employees: Emp[];
  initial: Record<string, FolderPerms>;
}) {
  return (
    <>
      <p className="text-[#7A7A7A] text-sm max-w-2xl mb-6">
        Define, como en Windows, qué puede hacer cada empleado dentro de cada
        carpeta de <b>Archivos compartidos</b>: <b>Acceso total</b>,{" "}
        <b>Lectura y escritura</b>, <b>Solo lectura</b> o <b>Sin acceso</b> (la
        carpeta queda oculta). Los administradores siempre tienen acceso total.
        Las carpetas nuevas aparecen aquí automáticamente.
      </p>

      {folders.length === 0 ? (
        <div className="bg-white border border-[#EDE9E0] py-16 text-center">
          <FolderTree size={32} className="text-[#EDE9E0] mx-auto mb-3" />
          <p className="text-[#7A7A7A] text-sm">
            No hay carpetas en «Archivos compartidos» todavía, o el NAS no
            respondió. Crea o comparte carpetas para administrar su acceso aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {folders.map((f) => (
            <FolderRow
              key={f.path}
              folder={f}
              employees={employees}
              initial={initial[f.path]}
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
  initial: FolderPerms;
}) {
  const [open, setOpen] = useState(false);
  const [levels, setLevels] = useState<Record<string, FolderPermLevel>>(
    initial?.levels ?? {},
  );
  const [defaultPerm, setDefaultPerm] = useState<FolderPermLevel>(
    initial?.defaultPerm ?? "escritura",
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const owner = (initial?.owner || "").toLowerCase();

  const baseline = useMemo(
    () => JSON.stringify({ levels: initial?.levels ?? {}, defaultPerm: initial?.defaultPerm }),
    [initial],
  );
  const dirty =
    JSON.stringify({ levels, defaultPerm }) !== baseline;

  // Quién tiene acceso (nivel != none), para las iniciales tipo Drive.
  const conAcceso = employees.filter(
    (e) => (levels[e.username] ?? defaultPerm) !== "none",
  );
  const sinAcceso = employees.length - conAcceso.length;

  const setLevel = (username: string, lv: FolderPermLevel) =>
    setLevels((m) => ({ ...m, [username]: lv }));

  const save = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/files/permisos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: folder.path, perms: levels, defaultPerm }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "No se pudo guardar.");
        return;
      }
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
      {/* Cabecera */}
      <div className="flex items-center justify-between gap-4 px-5 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <Folder size={18} className="text-[#C9A84C] shrink-0" />
          <div className="min-w-0">
            <p className="text-[#1B2A5E] text-sm font-semibold truncate">
              {folder.name}
            </p>
            <p className="text-[#7A7A7A] text-xs">
              {defaultPerm === "none"
                ? `${conAcceso.length} con acceso`
                : "Todos con acceso"}
              {sinAcceso > 0 && defaultPerm !== "none"
                ? ` · ${sinAcceso} sin acceso`
                : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Iniciales tipo Drive de quienes tienen acceso */}
          <div className="hidden sm:flex -space-x-2">
            {conAcceso.slice(0, 5).map((e) => (
              <span
                key={e.username}
                title={e.nombre}
                className="w-7 h-7 rounded-full bg-[#1B2A5E] border-2 border-white flex items-center justify-center text-[#C9A84C] text-[10px] font-bold"
              >
                {initials(e.nombre, e.username)}
              </span>
            ))}
            {conAcceso.length > 5 && (
              <span className="w-7 h-7 rounded-full bg-[#EDE9E0] border-2 border-white flex items-center justify-center text-[#7A7A7A] text-[10px] font-bold">
                +{conAcceso.length - 5}
              </span>
            )}
          </div>
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-1.5 border border-[#EDE9E0] text-[#1B2A5E] px-3 py-2 text-xs tracking-widest uppercase font-semibold hover:bg-[#F5F2EC]"
          >
            Permisos
            {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      {/* Formulario de permisos */}
      {open && (
        <div className="border-t border-[#EDE9E0] p-5">
          {/* Todos los demás */}
          <div className="flex items-center justify-between gap-3 bg-[#F5F2EC] px-4 py-3 mb-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <Users size={15} className="text-[#7A7A7A] shrink-0" />
              <div className="min-w-0">
                <p className="text-[#2C2C2C] text-sm font-medium">Todos los demás</p>
                <p className="text-[#7A7A7A] text-xs">
                  Nivel por defecto para quien no tenga uno específico
                </p>
              </div>
            </div>
            <LevelSelect value={defaultPerm} onChange={setDefaultPerm} />
          </div>

          {/* Por empleado */}
          <div className="border border-[#EDE9E0] max-h-80 overflow-y-auto">
            {employees.length === 0 ? (
              <p className="text-[#7A7A7A] text-xs p-4">
                No hay empleados registrados.
              </p>
            ) : (
              employees.map((emp) => {
                const isOwner = emp.username.toLowerCase() === owner;
                const value = isOwner ? "total" : levels[emp.username] ?? defaultPerm;
                return (
                  <div
                    key={emp.username}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-[#EDE9E0] last:border-0"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-7 h-7 rounded-full bg-[#1B2A5E] flex items-center justify-center text-[#C9A84C] text-[10px] font-bold shrink-0">
                        {initials(emp.nombre, emp.username)}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[#2C2C2C] text-sm truncate">
                          {emp.nombre}
                          {isOwner && (
                            <span className="text-[#C9A84C] text-xs ml-2">· Dueño</span>
                          )}
                        </p>
                        <p className="text-[#7A7A7A] text-xs truncate">@{emp.username}</p>
                      </div>
                    </div>
                    <LevelSelect
                      value={value}
                      disabled={isOwner}
                      onChange={(lv) => setLevel(emp.username, lv)}
                    />
                  </div>
                );
              })
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 px-3 py-2 text-red-600 text-xs mt-3">
              {error}
            </div>
          )}

          <div className="flex justify-end mt-4">
            <button
              onClick={save}
              disabled={saving || !dirty}
              className="flex items-center gap-2 bg-[#1B2A5E] text-[#F5F2EC] px-5 py-2.5 text-xs tracking-widest uppercase font-bold hover:bg-[#243470] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? (
                <Loader2 size={13} className="animate-spin" />
              ) : saved ? (
                <Check size={13} />
              ) : null}
              {saved ? "Guardado" : "Guardar permisos"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function LevelSelect({
  value,
  onChange,
  disabled,
}: {
  value: FolderPermLevel;
  onChange: (lv: FolderPermLevel) => void;
  disabled?: boolean;
}) {
  const Icon =
    value === "total"
      ? ShieldCheck
      : value === "escritura"
        ? Pencil
        : value === "lectura"
          ? Eye
          : EyeOff;
  return (
    <div className="flex items-center gap-2 shrink-0">
      <Icon
        size={14}
        className={value === "none" ? "text-[#C0BDB8]" : "text-[#C9A84C]"}
      />
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as FolderPermLevel)}
        className="border border-[#EDE9E0] bg-white text-[#2C2C2C] text-sm px-2 py-1.5 focus:outline-none focus:border-[#C9A84C] disabled:bg-[#F5F2EC] disabled:text-[#7A7A7A]"
      >
        {LEVELS.map((lv) => (
          <option key={lv} value={lv}>
            {LEVEL_LABEL[lv]}
          </option>
        ))}
      </select>
    </div>
  );
}
