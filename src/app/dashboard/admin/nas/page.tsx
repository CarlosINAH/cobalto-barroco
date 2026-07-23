"use client";

import DashboardShell from "@/components/dashboard/DashboardShell";
import { HardDrive, Upload, FolderPlus, Folder, FileImage, FileText, File, Trash2, Download, MoreVertical } from "lucide-react";
import { useState } from "react";

const carpetas = [
  { nombre: "Proyectos", archivos: 48, size: "2.4 GB" },
  { nombre: "Personal — CVs y perfiles", archivos: 23, size: "340 MB" },
  { nombre: "Inventario", archivos: 12, size: "89 MB" },
  { nombre: "Contratos y documentación", archivos: 31, size: "510 MB" },
  { nombre: "Fotografías de obra", archivos: 284, size: "18.2 GB" },
];

const archivosRecientes = [
  { name: "foto-reintegracion-01.jpg", type: "img", size: "4.7 MB", fecha: "30 May", user: "Juan P." },
  { name: "contrato-retablo-san-miguel.pdf", type: "pdf", size: "1.2 MB", fecha: "28 May", user: "Admin" },
  { name: "cv-sofia-landa.pdf", type: "pdf", size: "890 KB", fecha: "20 May", user: "Admin" },
  { name: "inventario-mayo-2025.xlsx", type: "doc", size: "210 KB", fecha: "15 May", user: "Admin" },
];

const iconMap = {
  img: <FileImage size={16} className="text-[#C9A84C]" />,
  pdf: <FileText size={16} className="text-red-400" />,
  doc: <File size={16} className="text-blue-400" />,
};

export default function NASAdmin() {
  const usedGB = 21.5;
  const totalGB = 100;
  const pct = (usedGB / totalGB) * 100;

  return (
    <DashboardShell role="admin" title="Nube NAS — Control de archivos">
      {/* Storage overview */}
      <div className="bg-[#1B2A5E] p-6 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <HardDrive size={24} className="text-[#C9A84C]" />
            <div>
              <p className="text-[#C9A84C] text-xs tracking-widest uppercase font-semibold">
                Servidor NAS — Cobalto Barroco
              </p>
              <p className="text-[#F5F2EC]/50 text-xs">192.168.1.100 · Estado: En línea</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 border border-[#C9A84C] text-[#C9A84C] hover:bg-[#C9A84C] hover:text-[#1B2A5E] px-4 py-2 text-xs tracking-widest uppercase font-semibold transition-all">
              <Upload size={12} /> Subir
            </button>
            <button className="flex items-center gap-2 border border-[#F5F2EC]/20 text-[#F5F2EC]/60 hover:border-[#F5F2EC]/40 hover:text-[#F5F2EC] px-4 py-2 text-xs tracking-widest uppercase transition-colors">
              <FolderPlus size={12} /> Nueva carpeta
            </button>
          </div>
        </div>
        {/* Storage bar */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-2 bg-[#F5F2EC]/10">
            <div className="h-2 bg-gradient-to-r from-[#C9A84C] to-[#D4B86A]"
              style={{ width: `${pct}%` }} />
          </div>
          <p className="text-[#F5F2EC]/70 text-xs shrink-0">
            <span className="text-[#F5F2EC] font-semibold">{usedGB} GB</span> / {totalGB} GB usados
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Folders */}
        <div className="bg-white border border-[#EDE9E0] p-6">
          <h3 className="text-[#1B2A5E] text-lg mb-5" style={{ fontFamily: "var(--font-playfair)" }}>
            Carpetas
          </h3>
          <div className="space-y-3">
            {carpetas.map((c) => (
              <div key={c.nombre}
                className="flex items-center gap-3 p-3 hover:bg-[#F5F2EC] transition-colors cursor-pointer group"
              >
                <Folder size={20} className="text-[#C9A84C] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[#2C2C2C] text-sm font-medium truncate">{c.nombre}</p>
                  <p className="text-[#7A7A7A] text-xs">{c.archivos} archivos · {c.size}</p>
                </div>
                <MoreVertical size={14} className="text-[#EDE9E0] group-hover:text-[#7A7A7A] transition-colors shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {/* Recent files */}
        <div className="bg-white border border-[#EDE9E0] p-6">
          <h3 className="text-[#1B2A5E] text-lg mb-5" style={{ fontFamily: "var(--font-playfair)" }}>
            Archivos recientes
          </h3>
          <div className="space-y-3">
            {archivosRecientes.map((f) => (
              <div key={f.name}
                className="flex items-center gap-3 p-3 hover:bg-[#F5F2EC] transition-colors group"
              >
                {iconMap[f.type as keyof typeof iconMap]}
                <div className="flex-1 min-w-0">
                  <p className="text-[#2C2C2C] text-sm truncate">{f.name}</p>
                  <p className="text-[#7A7A7A] text-xs">{f.size} · {f.fecha} · {f.user}</p>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="text-[#7A7A7A] hover:text-[#1B2A5E] transition-colors">
                    <Download size={13} />
                  </button>
                  <button className="text-[#7A7A7A] hover:text-red-400 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
