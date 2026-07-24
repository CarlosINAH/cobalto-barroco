import DashboardShell from "@/components/dashboard/DashboardShell";
import { requireAdmin } from "@/lib/auth-server";
import { mailConfigured } from "@/lib/mailer";
import { getDB } from "@/lib/db";
import { Server, Mail, HardDrive, Users, CheckCircle2, XCircle } from "lucide-react";

export const dynamic = "force-dynamic";

function Estado({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
        ok ? "text-emerald-600" : "text-amber-600"
      }`}
    >
      {ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
      {label}
    </span>
  );
}

export default async function ConfiguracionAdmin() {
  const session = await requireAdmin();
  const db = await getDB();

  const webdavHost = (process.env.WEBDAV_URL || "—").replace(/\/+$/, "");
  const admins = (process.env.ADMIN_USERS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const smtpOk = mailConfigured();

  const card =
    "bg-white border border-[#EDE9E0] p-5";
  const row = "flex items-center justify-between py-2 text-sm";
  const key = "text-[#7A7A7A]";
  const val = "text-[#2C2C2C] font-medium";

  return (
    <DashboardShell role="admin" title="Configuración">
      <div className="grid gap-5 md:grid-cols-2">
        <div className={card}>
          <div className="flex items-center gap-2 mb-3 text-[#1B2A5E]">
            <Server size={16} className="text-[#C9A84C]" />
            <h3 className="font-semibold">Servidor (NAS)</h3>
          </div>
          <div className="divide-y divide-[#EDE9E0]">
            <div className={row}>
              <span className={key}>Autenticación</span>
              <Estado ok label="Cuentas del NAS (WebDAV)" />
            </div>
            <div className={row}>
              <span className={key}>Servicio WebDAV</span>
              <span className={val}>{webdavHost}</span>
            </div>
            <div className={row}>
              <span className={key}>Sesión activa</span>
              <span className={val}>@{session.username}</span>
            </div>
          </div>
        </div>

        <div className={card}>
          <div className="flex items-center gap-2 mb-3 text-[#1B2A5E]">
            <Mail size={16} className="text-[#C9A84C]" />
            <h3 className="font-semibold">Correo (mensajería)</h3>
          </div>
          <div className="divide-y divide-[#EDE9E0]">
            <div className={row}>
              <span className={key}>Envío por correo (SMTP)</span>
              <Estado ok={smtpOk} label={smtpOk ? "Configurado" : "Sin configurar"} />
            </div>
            <div className={row}>
              <span className={key}>Remitente</span>
              <span className={val}>{process.env.SMTP_FROM || process.env.SMTP_USER || "—"}</span>
            </div>
          </div>
          {!smtpOk && (
            <p className="text-[#7A7A7A] text-xs mt-3">
              Los mensajes se guardan en la plataforma, pero para que lleguen al
              correo de cada persona falta configurar el SMTP.
            </p>
          )}
        </div>

        <div className={card}>
          <div className="flex items-center gap-2 mb-3 text-[#1B2A5E]">
            <Users size={16} className="text-[#C9A84C]" />
            <h3 className="font-semibold">Administradores</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {admins.length === 0 ? (
              <span className="text-[#7A7A7A] text-sm">Ninguno configurado.</span>
            ) : (
              admins.map((a) => (
                <span
                  key={a}
                  className="bg-[#F5F2EC] border border-[#EDE9E0] text-[#2C2C2C] text-xs px-2.5 py-1"
                >
                  {a}
                </span>
              ))
            )}
          </div>
        </div>

        <div className={card}>
          <div className="flex items-center gap-2 mb-3 text-[#1B2A5E]">
            <HardDrive size={16} className="text-[#C9A84C]" />
            <h3 className="font-semibold">Resumen de datos</h3>
          </div>
          <div className="divide-y divide-[#EDE9E0]">
            <div className={row}>
              <span className={key}>Proyectos</span>
              <span className={val}>{db.projects.length}</span>
            </div>
            <div className={row}>
              <span className={key}>Empleados</span>
              <span className={val}>{db.employees.length}</span>
            </div>
            <div className={row}>
              <span className={key}>Mensajes</span>
              <span className={val}>{db.messages.length}</span>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
