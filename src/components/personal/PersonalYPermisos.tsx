"use client";

import { useState } from "react";
import { Users, FolderLock } from "lucide-react";
import PersonalManager from "@/components/personal/PersonalManager";
import PermisosManager from "@/components/permisos/PermisosManager";

type Tab = "personal" | "permisos";

export default function PersonalYPermisos({
  personal,
  permisos,
}: {
  personal: React.ComponentProps<typeof PersonalManager>;
  permisos: React.ComponentProps<typeof PermisosManager>;
}) {
  const [tab, setTab] = useState<Tab>("personal");

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
        <TabBtn id="personal" icon={Users} label="Empleados" />
        <TabBtn id="permisos" icon={FolderLock} label="Permisos de carpetas" />
      </div>
      {tab === "personal" ? (
        <PersonalManager {...personal} />
      ) : (
        <PermisosManager {...permisos} />
      )}
    </>
  );
}
