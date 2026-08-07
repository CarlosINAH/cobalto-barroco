"use client";

import { useEffect, useState } from "react";
import { Mail, Phone, User, Loader2, Check, AlertCircle, KeyRound } from "lucide-react";

export default function ConfiguracionEmpleado() {
  const [nombre, setNombre] = useState("");
  const [rol, setRol] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setNombre(d.nombre || "");
          setRol(d.rol || "");
          setEmail(d.email || "");
          setTelefono(d.telefono || "");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, telefono }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo guardar.");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Error de conexión.");
    } finally {
      setSaving(false);
    }
  };

  const label = "block text-[#7A7A7A] text-xs tracking-widest uppercase mb-1.5";
  const field =
    "w-full border border-[#EDE9E0] bg-white pl-9 pr-4 py-2.5 text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A84C]";

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[#7A7A7A] text-sm py-16 justify-center">
        <Loader2 size={16} className="animate-spin" /> Cargando tu perfil…
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-6">
      {/* Identidad */}
      <div className="bg-white border border-[#EDE9E0] p-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-[#1B2A5E] flex items-center justify-center shrink-0">
            <User size={18} className="text-[#C9A84C]" />
          </div>
          <div>
            <p className="text-[#1B2A5E] font-semibold">{nombre}</p>
            <p className="text-[#7A7A7A] text-xs">{rol || "Empleado"}</p>
          </div>
        </div>
      </div>

      {/* Datos de contacto */}
      <form onSubmit={save} className="bg-white border border-[#EDE9E0] p-6 space-y-4">
        <h3 className="text-[#1B2A5E] text-lg mb-1" style={{ fontFamily: "var(--font-playfair)" }}>
          Datos de contacto
        </h3>
        <p className="text-[#7A7A7A] text-xs mb-2">
          Mantén tu correo y teléfono al día para que el equipo pueda contactarte.
        </p>

        <div>
          <label className={label} htmlFor="cfg-email">Correo electrónico</label>
          <div className="relative">
            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A7A7A]" />
            <input
              id="cfg-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              className={field}
            />
          </div>
        </div>

        <div>
          <label className={label} htmlFor="cfg-tel">Teléfono</label>
          <div className="relative">
            <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A7A7A]" />
            <input
              id="cfg-tel"
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="+52 55 0000 0000"
              className={field}
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 px-3 py-2.5 text-red-600 text-xs">
            <AlertCircle size={13} className="shrink-0" /> {error}
          </div>
        )}

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-[#1B2A5E] text-[#F5F2EC] px-5 py-2.5 text-xs tracking-widest uppercase font-bold hover:bg-[#243470] disabled:opacity-60"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            Guardar cambios
          </button>
          {saved && (
            <span className="flex items-center gap-1 text-emerald-600 text-xs">
              <Check size={13} /> Guardado
            </span>
          )}
        </div>
      </form>

      {/* Contraseña */}
      <div className="bg-white border border-[#EDE9E0] p-6">
        <div className="flex items-center gap-2 mb-2">
          <KeyRound size={16} className="text-[#C9A84C]" />
          <h3 className="text-[#1B2A5E] text-lg" style={{ fontFamily: "var(--font-playfair)" }}>
            Contraseña
          </h3>
        </div>
        <p className="text-[#7A7A7A] text-sm leading-relaxed">
          Tu acceso usa la contraseña de tu <span className="font-medium text-[#2C2C2C]">cuenta del NAS</span>.
          Por seguridad, se cambia desde el portal del NAS (Panel de control → Usuario),
          no desde esta plataforma. Si necesitas ayuda, contacta a un administrador.
        </p>
      </div>
    </div>
  );
}
