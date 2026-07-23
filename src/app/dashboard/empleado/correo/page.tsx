import DashboardShell from "@/components/dashboard/DashboardShell";
import { Reply, Forward, Trash2, Star, Paperclip } from "lucide-react";

const emails = [
  {
    id: 1,
    from: "Admin — Cobalto Barroco",
    subject: "Actualización: Retablo Mayor de San Miguel",
    preview: "El cliente ha solicitado una revisión del avance. Por favor adjunta las fotos...",
    time: "10:32",
    unread: true,
    starred: false,
    hasAttachment: false,
  },
  {
    id: 2,
    from: "María González",
    subject: "Solicitud de material aprobada",
    preview: "Tu solicitud de 3 kg de cera microcristalina ha sido aprobada para el proyecto...",
    time: "09:15",
    unread: true,
    starred: true,
    hasAttachment: false,
  },
  {
    id: 3,
    from: "Sistema",
    subject: "Recordatorio: Registro de asistencia",
    preview: "No olvides registrar tu entrada de hoy antes de las 9:30 am...",
    time: "08:00",
    unread: true,
    starred: false,
    hasAttachment: false,
  },
  {
    id: 4,
    from: "Admin — Cobalto Barroco",
    subject: "Documentación del proyecto — semana 3",
    preview: "Adjunto encontrarás el reporte semanal. Favor de revisar las observaciones...",
    time: "Ayer",
    unread: false,
    starred: false,
    hasAttachment: true,
  },
  {
    id: 5,
    from: "Carlos Ruiz",
    subject: "Pregunta sobre técnica de dorado",
    preview: "Hola Juan, quería consultarte sobre el proceso de aplicación de pan de oro...",
    time: "Ayer",
    unread: false,
    starred: true,
    hasAttachment: false,
  },
];

export default function CorreoEmpleado() {
  return (
    <DashboardShell role="empleado" title="Bandeja de entrada">
      <div className="bg-white border border-[#EDE9E0]">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-[#EDE9E0]">
          <span className="text-[#7A7A7A] text-xs tracking-widest uppercase">
            {emails.filter((e) => e.unread).length} sin leer
          </span>
          <div className="flex-1" />
          <button className="flex items-center gap-1.5 text-[#7A7A7A] hover:text-[#1B2A5E] text-xs transition-colors">
            <Trash2 size={13} /> Vaciar leídos
          </button>
        </div>

        {/* Email list */}
        {emails.map((email, i) => (
          <div
            key={email.id}
            className={`flex items-start gap-4 px-5 py-4 cursor-pointer hover:bg-[#F5F2EC] transition-colors border-b border-[#EDE9E0] last:border-0 ${
              email.unread ? "bg-[#F5F2EC]/70" : ""
            }`}
          >
            {/* Unread dot */}
            <div className="mt-1.5 w-2 h-2 rounded-full shrink-0">
              {email.unread && <div className="w-2 h-2 rounded-full bg-[#C9A84C]" />}
            </div>

            {/* Avatar */}
            <div className="w-9 h-9 bg-[#1B2A5E] flex items-center justify-center shrink-0">
              <span className="text-[#C9A84C] text-xs font-bold">
                {email.from.charAt(0)}
              </span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <p
                  className={`text-sm truncate ${
                    email.unread
                      ? "text-[#1B2A5E] font-semibold"
                      : "text-[#2C2C2C]"
                  }`}
                >
                  {email.from}
                </p>
                <div className="flex items-center gap-2 shrink-0">
                  {email.hasAttachment && (
                    <Paperclip size={12} className="text-[#7A7A7A]" />
                  )}
                  <span className="text-[#7A7A7A] text-xs">{email.time}</span>
                </div>
              </div>
              <p
                className={`text-sm mb-0.5 truncate ${
                  email.unread ? "text-[#2C2C2C] font-medium" : "text-[#7A7A7A]"
                }`}
              >
                {email.subject}
              </p>
              <p className="text-[#7A7A7A] text-xs truncate">{email.preview}</p>
            </div>

            {/* Actions on hover (shown via group, simplified) */}
            <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100">
              <Star
                size={14}
                className={email.starred ? "text-[#C9A84C] fill-[#C9A84C]" : "text-[#7A7A7A]"}
              />
            </div>
          </div>
        ))}
      </div>
    </DashboardShell>
  );
}
