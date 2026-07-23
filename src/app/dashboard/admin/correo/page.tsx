import DashboardShell from "@/components/dashboard/DashboardShell";
import { PenSquare, Paperclip, Star } from "lucide-react";

const emails = [
  { id: 1, from: "Cliente — Parroquia San Miguel", subject: "Avance del retablo — solicitud de fotos", preview: "Estimados, quisiéramos recibir las fotos del avance de esta semana para presentarlas...", time: "11:20", unread: true, starred: true },
  { id: 2, from: "Juan Pérez (Empleado)", subject: "Solicitud de material — cera microcristalina", preview: "Hola, necesito 3 kg de cera microcristalina para la etapa de consolidación del retablo...", time: "10:05", unread: true, starred: false },
  { id: 3, from: "Sofía Landa (Empleada)", subject: "Reporte semana 8 — Palacio de la Reforma", preview: "Adjunto el reporte de la semana 8. Se completaron los trabajos de cantería en fachada norte...", time: "09:30", unread: true, starred: false, hasAttachment: true },
  { id: 4, from: "Proveedor — Materiales Arte", subject: "Cotización pan de oro 23k", preview: "Estimados, en respuesta a su solicitud, les enviamos la cotización de pan de oro...", time: "08:45", unread: true, starred: false, hasAttachment: true },
  { id: 5, from: "Cliente — Capilla Privada", subject: "Reunión de seguimiento — Junio", preview: "Buen día, nos gustaría agendar una reunión de seguimiento para revisar el avance...", time: "Ayer", unread: false, starred: false },
];

export default function CorreoAdmin() {
  return (
    <DashboardShell role="admin" title="Correo">
      <div className="flex gap-6 h-[calc(100vh-10rem)]">
        {/* Sidebar */}
        <div className="w-48 shrink-0">
          <button className="w-full flex items-center justify-center gap-2 bg-[#C9A84C] text-[#1B2A5E] py-3 text-xs tracking-widest uppercase font-bold hover:bg-[#D4B86A] transition-colors mb-4">
            <PenSquare size={13} /> Redactar
          </button>
          <ul className="space-y-1">
            {["Bandeja de entrada", "Enviados", "Borradores", "Destacados", "Archivados"].map((l) => (
              <li key={l}>
                <button className={`w-full text-left px-3 py-2 text-sm transition-colors ${l === "Bandeja de entrada" ? "bg-[#1B2A5E] text-[#C9A84C] font-semibold" : "text-[#7A7A7A] hover:bg-[#EDE9E0]"}`}>
                  {l}
                  {l === "Bandeja de entrada" && (
                    <span className="float-right bg-[#C9A84C] text-[#1B2A5E] text-xs font-bold px-1.5 rounded-full">5</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Email list */}
        <div className="flex-1 bg-white border border-[#EDE9E0] overflow-y-auto">
          {emails.map((email) => (
            <div key={email.id}
              className={`flex items-start gap-4 px-5 py-4 cursor-pointer hover:bg-[#F5F2EC] transition-colors border-b border-[#EDE9E0] last:border-0 ${email.unread ? "bg-[#F5F2EC]/60" : ""}`}
            >
              <div className="mt-1.5 w-2 h-2 shrink-0">
                {email.unread && <div className="w-2 h-2 rounded-full bg-[#C9A84C]" />}
              </div>
              <div className="w-9 h-9 bg-[#1B2A5E] flex items-center justify-center shrink-0">
                <span className="text-[#C9A84C] text-xs font-bold">{email.from.charAt(0)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <p className={`text-sm truncate ${email.unread ? "text-[#1B2A5E] font-semibold" : "text-[#2C2C2C]"}`}>{email.from}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    {(email as any).hasAttachment && <Paperclip size={12} className="text-[#7A7A7A]" />}
                    <Star size={12} className={email.starred ? "text-[#C9A84C] fill-[#C9A84C]" : "text-[#EDE9E0]"} />
                    <span className="text-[#7A7A7A] text-xs">{email.time}</span>
                  </div>
                </div>
                <p className={`text-sm mb-0.5 truncate ${email.unread ? "text-[#2C2C2C] font-medium" : "text-[#7A7A7A]"}`}>{email.subject}</p>
                <p className="text-[#7A7A7A] text-xs truncate">{email.preview}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
