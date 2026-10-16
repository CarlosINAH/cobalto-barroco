"use client";

import { useState } from "react";
import { HardDrive, Share2 } from "lucide-react";
import FileBrowser from "@/components/files/FileBrowser";

type Tab = "personal" | "compartidos";

/**
 * Unifica "Nube personal" y "Archivos compartidos" en una sola vista con
 * pestañas. La pestaña de compartidos se auto-actualiza para ver archivos
 * nuevos que suba otra persona.
 */
export default function NubeTabs({
  personalLabel,
  personal,
  shared,
  initialTab = "personal",
}: {
  personalLabel: string;
  personal: React.ComponentProps<typeof FileBrowser>;
  shared: React.ComponentProps<typeof FileBrowser>;
  initialTab?: Tab;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);

  const TabBtn = ({
    id,
    icon: Icon,
    label,
  }: {
    id: Tab;
    icon: React.ElementType;
    label: string;
  }) => {
    const active = tab === id;
    return (
      <button
        onClick={() => setTab(id)}
        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
          active
            ? "border-[#C9A84C] text-[#1B2A5E]"
            : "border-transparent text-[#7A7A7A] hover:text-[#1B2A5E]"
        }`}
      >
        <Icon size={15} className={active ? "text-[#C9A84C]" : ""} />
        {label}
      </button>
    );
  };

  return (
    <>
      <div className="flex gap-1 border-b border-[#EDE9E0] mb-6">
        <TabBtn id="personal" icon={HardDrive} label={personalLabel} />
        <TabBtn id="compartidos" icon={Share2} label="Archivos compartidos" />
      </div>
      {/* Se monta solo la pestaña activa: cada una carga su propio contenido. */}
      {tab === "personal" ? (
        <FileBrowser {...personal} />
      ) : (
        <FileBrowser {...shared} />
      )}
    </>
  );
}
