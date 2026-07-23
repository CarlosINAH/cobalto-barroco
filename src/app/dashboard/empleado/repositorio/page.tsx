import DashboardShell from "@/components/dashboard/DashboardShell";
import { FileImage, FileText, File, Upload, FolderOpen, Download } from "lucide-react";

const archivos = [
  { name: "diagnostico-inicial.pdf", type: "pdf", size: "2.4 MB", fecha: "15 Ene 2025", subido: "Juan P." },
  { name: "foto-antes-limpieza-01.jpg", type: "img", size: "4.1 MB", fecha: "20 Ene 2025", subido: "Juan P." },
  { name: "foto-antes-limpieza-02.jpg", type: "img", size: "3.8 MB", fecha: "20 Ene 2025", subido: "Juan P." },
  { name: "informe-semana-1.docx", type: "doc", size: "540 KB", fecha: "22 Ene 2025", subido: "Admin" },
  { name: "foto-consolidacion-01.jpg", type: "img", size: "5.2 MB", fecha: "05 Feb 2025", subido: "Juan P." },
  { name: "materiales-utilizados.xlsx", type: "doc", size: "128 KB", fecha: "10 Feb 2025", subido: "Admin" },
  { name: "foto-reintegracion-01.jpg", type: "img", size: "4.7 MB", fecha: "28 May 2025", subido: "Juan P." },
];

const iconMap = {
  img: <FileImage size={18} className="text-[#C9A84C]" />,
  pdf: <FileText size={18} className="text-red-400" />,
  doc: <File size={18} className="text-blue-400" />,
};

export default function RepositorioEmpleado() {
  return (
    <DashboardShell role="empleado" title="Repositorio del proyecto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3 text-[#7A7A7A] text-sm">
          <FolderOpen size={16} className="text-[#C9A84C]" />
          <span>Retablo Mayor — Parroquia de San Miguel</span>
          <span className="text-[#EDE9E0]">/</span>
          <span className="text-[#1B2A5E] font-medium">Todos los archivos</span>
        </div>
        <button className="flex items-center gap-2 bg-[#1B2A5E] text-[#F5F2EC] px-4 py-2.5 text-xs tracking-widest uppercase font-semibold hover:bg-[#243470] transition-colors">
          <Upload size={13} /> Subir archivo
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total archivos", value: "12" },
          { label: "Imágenes", value: "8" },
          { label: "Documentos", value: "4" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-[#EDE9E0] p-4 text-center">
            <p
              className="text-[#1B2A5E] text-2xl font-bold"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              {s.value}
            </p>
            <p className="text-[#7A7A7A] text-xs uppercase tracking-wider mt-1">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* File table */}
      <div className="bg-white border border-[#EDE9E0]">
        <div className="grid grid-cols-12 px-5 py-3 border-b border-[#EDE9E0] text-[#7A7A7A] text-xs tracking-widest uppercase">
          <div className="col-span-5">Nombre</div>
          <div className="col-span-2 hidden md:block">Tamaño</div>
          <div className="col-span-3 hidden md:block">Fecha</div>
          <div className="col-span-2 text-right">Acción</div>
        </div>
        {archivos.map((f) => (
          <div
            key={f.name}
            className="grid grid-cols-12 px-5 py-3.5 border-b border-[#EDE9E0] last:border-0 hover:bg-[#F5F2EC] transition-colors items-center"
          >
            <div className="col-span-5 flex items-center gap-3">
              {iconMap[f.type as keyof typeof iconMap]}
              <span className="text-[#2C2C2C] text-sm truncate">{f.name}</span>
            </div>
            <div className="col-span-2 hidden md:block text-[#7A7A7A] text-sm">
              {f.size}
            </div>
            <div className="col-span-3 hidden md:block text-[#7A7A7A] text-sm">
              {f.fecha}
            </div>
            <div className="col-span-2 flex justify-end">
              <button className="text-[#7A7A7A] hover:text-[#1B2A5E] transition-colors p-1">
                <Download size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </DashboardShell>
  );
}
