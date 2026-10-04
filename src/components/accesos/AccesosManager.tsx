"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Loader2, UserCheck, Clock, ShieldX, UserPlus } from "lucide-react";

interface Entry {
  username: string;
  nombre?: string;
  estado: "pendiente" | "aprobado" | "rechazado";
  solicitadoEn: number;
  decididoEn?: number;
  decididoPor?: string;
}

function fmt(ms?: number) {
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AccesosManager({ initial }: { initial: Entry[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  const act = async (username: string, estado: "aprobado" | "rechazado") => {
    setBusy(username);
    try {
      await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, estado }),
      });
      router.refresh();
    } finally {
      setBusy(null);
    }
  };

  const pendientes = initial.filter((a) => a.estado === "pendiente");
  const aprobados = initial.filter((a) => a.estado === "aprobado");
  const rechazados = initial.filter((a) => a.estado === "rechazado");

  const Avatar = ({ e }: { e: Entry }) => (
    <div className="w-9 h-9 bg-[#1B2A5E] flex items-center justify-center shrink-0">
      <span className="text-[#C9A84C] text-xs font-bold">
        {(e.nombre || e.username)
          .split(" ")
          .map((s) => s[0])
          .slice(0, 2)
          .join("")
          .toUpperCase()}
      </span>
    </div>
  );

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <p className="text-[#7A7A7A] text-sm max-w-xl">
          Cualquier persona con cuenta en el NAS entra automáticamente al usar la
          plataforma por primera vez. Desde aquí puedes revocar el acceso de
          alguien en concreto (o volver a darle acceso si lo revocaste).
        </p>
        <button
          onClick={() => setInviteOpen(true)}
          className="flex items-center gap-2 bg-[#1B2A5E] text-[#F5F2EC] px-4 py-2.5 text-xs tracking-widest uppercase font-semibold hover:bg-[#243470] shrink-0"
        >
          <UserPlus size={13} /> Pre-aprobar
        </button>
      </div>

      {/* Pendientes */}
      <section className="mb-8">
        <h2 className="flex items-center gap-2 text-[#1B2A5E] text-lg mb-3" style={{ fontFamily: "var(--font-playfair)" }}>
          <Clock size={16} className="text-[#C9A84C]" /> Pendientes
          {pendientes.length > 0 && (
            <span className="bg-[#C9A84C] text-[#1B2A5E] text-xs font-bold px-2 py-0.5 rounded-full">
              {pendientes.length}
            </span>
          )}
        </h2>
        {pendientes.length === 0 ? (
          <div className="bg-white border border-[#EDE9E0] py-8 text-center text-[#7A7A7A] text-sm">
            No hay solicitudes pendientes.
          </div>
        ) : (
          <div className="bg-white border border-[#EDE9E0]">
            {pendientes.map((e) => (
              <div key={e.username} className="flex items-center justify-between gap-4 px-5 py-4 border-b border-[#EDE9E0] last:border-0">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar e={e} />
                  <div className="min-w-0">
                    <p className="text-[#1B2A5E] text-sm font-semibold truncate">
                      {e.nombre || e.username}
                    </p>
                    <p className="text-[#7A7A7A] text-xs">@{e.username} · solicitó {fmt(e.solicitadoEn)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => act(e.username, "aprobado")}
                    disabled={busy === e.username}
                    className="flex items-center gap-1 bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {busy === e.username ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                    Aprobar
                  </button>
                  <button
                    onClick={() => act(e.username, "rechazado")}
                    disabled={busy === e.username}
                    className="flex items-center gap-1 border border-[#EDE9E0] text-[#7A7A7A] px-3 py-1.5 text-xs font-semibold hover:text-red-500 hover:border-red-200 disabled:opacity-50"
                  >
                    <X size={12} /> Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Aprobados */}
      <section className="mb-8">
        <h2 className="flex items-center gap-2 text-[#1B2A5E] text-lg mb-3" style={{ fontFamily: "var(--font-playfair)" }}>
          <UserCheck size={16} className="text-emerald-600" /> Con acceso ({aprobados.length})
        </h2>
        {aprobados.length === 0 ? (
          <div className="bg-white border border-[#EDE9E0] py-8 text-center text-[#7A7A7A] text-sm">
            Todavía nadie con acceso aprobado.
          </div>
        ) : (
          <div className="bg-white border border-[#EDE9E0]">
            {aprobados.map((e) => (
              <div key={e.username} className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-[#EDE9E0] last:border-0">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar e={e} />
                  <div className="min-w-0">
                    <p className="text-[#2C2C2C] text-sm truncate">{e.nombre || e.username}</p>
                    <p className="text-[#7A7A7A] text-xs">@{e.username}</p>
                  </div>
                </div>
                <button
                  onClick={() => act(e.username, "rechazado")}
                  disabled={busy === e.username}
                  className="flex items-center gap-1 text-[#7A7A7A] hover:text-red-500 text-xs font-semibold px-2 py-1 disabled:opacity-50"
                >
                  {busy === e.username ? <Loader2 size={12} className="animate-spin" /> : <ShieldX size={12} />}
                  Revocar
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Rechazados */}
      {rechazados.length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 text-[#1B2A5E] text-lg mb-3" style={{ fontFamily: "var(--font-playfair)" }}>
            <ShieldX size={16} className="text-red-500" /> Rechazados ({rechazados.length})
          </h2>
          <div className="bg-white border border-[#EDE9E0]">
            {rechazados.map((e) => (
              <div key={e.username} className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-[#EDE9E0] last:border-0">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar e={e} />
                  <div className="min-w-0">
                    <p className="text-[#2C2C2C] text-sm truncate">{e.nombre || e.username}</p>
                    <p className="text-[#7A7A7A] text-xs">@{e.username}</p>
                  </div>
                </div>
                <button
                  onClick={() => act(e.username, "aprobado")}
                  disabled={busy === e.username}
                  className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 text-xs font-semibold px-2 py-1 disabled:opacity-50"
                >
                  {busy === e.username ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                  Dar acceso
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {inviteOpen && (
        <InviteModal
          onClose={() => setInviteOpen(false)}
          onDone={() => {
            setInviteOpen(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function InviteModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const send = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, estado: "aprobado" }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "No se pudo guardar.");
      else onDone();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-[#F5F2EC] w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EDE9E0]">
          <h3 className="text-[#1B2A5E] text-lg" style={{ fontFamily: "var(--font-playfair)" }}>
            Pre-aprobar usuario
          </h3>
          <button onClick={onClose} className="text-[#7A7A7A] hover:text-[#1B2A5E]">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-[#7A7A7A] text-sm">
            Autoriza por adelantado a alguien por su <b>usuario del NAS</b>. Podrá
            entrar en cuanto inicie sesión (la cuenta del NAS debe existir en
            UGOS).
          </p>
          <div>
            <label className="block text-[#7A7A7A] text-xs tracking-widest uppercase mb-1.5">
              Usuario del NAS
            </label>
            <input
              className="w-full border border-[#EDE9E0] bg-white px-3 py-2.5 text-sm text-[#2C2C2C] focus:outline-none focus:border-[#C9A84C]"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="nombre.usuario"
            />
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 px-3 py-2 text-red-600 text-xs">{error}</div>
          )}
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-[#EDE9E0]">
          <button onClick={onClose} className="px-4 py-2.5 text-xs tracking-widest uppercase font-semibold text-[#7A7A7A] hover:text-[#1B2A5E]">
            Cancelar
          </button>
          <button
            onClick={send}
            disabled={saving || !username.trim()}
            className="flex items-center gap-2 bg-[#1B2A5E] text-[#F5F2EC] px-5 py-2.5 text-xs tracking-widest uppercase font-bold hover:bg-[#243470] disabled:opacity-50"
          >
            {saving && <Loader2 size={13} className="animate-spin" />}
            Autorizar
          </button>
        </div>
      </div>
    </div>
  );
}
