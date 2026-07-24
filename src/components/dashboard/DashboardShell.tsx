"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/brand/Logo";
import {
  LayoutDashboard,
  Mail,
  FolderOpen,
  BookOpen,
  Star,
  MapPin,
  Package,
  Users,
  FolderKanban,
  HardDrive,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Bell,
  Settings,
} from "lucide-react";

type Role = "empleado" | "admin";

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: number;
}

const empleadoNav: NavItem[] = [
  { icon: LayoutDashboard, label: "Inicio", href: "/dashboard/empleado" },
  { icon: Mail, label: "Mensajes", href: "/dashboard/empleado/correo" },
  { icon: FolderOpen, label: "Proyecto asignado", href: "/dashboard/empleado/proyecto" },
  { icon: BookOpen, label: "Repositorio", href: "/dashboard/empleado/repositorio" },
  { icon: Star, label: "Mis habilidades", href: "/dashboard/empleado/habilidades" },
  { icon: MapPin, label: "Asistencia", href: "/dashboard/empleado/asistencia" },
  { icon: Package, label: "Solicitud de material", href: "/dashboard/empleado/materiales" },
];

const adminNav: NavItem[] = [
  { icon: LayoutDashboard, label: "Panel general", href: "/dashboard/admin" },
  { icon: Mail, label: "Mensajes", href: "/dashboard/admin/correo" },
  { icon: FolderKanban, label: "Proyectos", href: "/dashboard/admin/proyectos" },
  { icon: Users, label: "Personal", href: "/dashboard/admin/personal" },
  { icon: Package, label: "Inventario", href: "/dashboard/admin/inventario" },
  { icon: HardDrive, label: "Nube NAS", href: "/dashboard/admin/nas" },
  { icon: Settings, label: "Configuración", href: "/dashboard/admin/configuracion" },
];

export default function DashboardShell({
  role,
  children,
  title,
}: {
  role: Role;
  children: React.ReactNode;
  title: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const nav = role === "empleado" ? empleadoNav : adminNav;
  const roleLabel = role === "empleado" ? "Empleado" : "Administrador";

  return (
    <div className="flex h-screen bg-[#F5F2EC] overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`bg-[#1B2A5E] flex flex-col transition-all duration-300 shrink-0 ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        {/* Logo */}
        <div
          className={`flex items-center h-16 px-4 border-b border-[#F5F2EC]/10 ${
            collapsed ? "justify-center" : "gap-3"
          }`}
        >
          <Logo size={34} />
          {!collapsed && (
            <span
              className="text-[#F5F2EC] text-sm font-semibold truncate"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              Cobalto Barroco
            </span>
          )}
        </div>

        {/* Role badge */}
        {!collapsed && (
          <div className="px-4 py-3 border-b border-[#F5F2EC]/10">
            <span className="text-[#C9A84C] text-xs tracking-widest uppercase font-semibold">
              {roleLabel}
            </span>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-0.5 overflow-y-auto">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-150 relative group ${
                  active
                    ? "bg-[#C9A84C]/15 text-[#C9A84C] border-r-2 border-[#C9A84C]"
                    : "text-[#F5F2EC]/60 hover:bg-[#F5F2EC]/5 hover:text-[#F5F2EC]"
                }`}
              >
                <Icon size={16} className="shrink-0" />
                {!collapsed && (
                  <span className="truncate flex-1">{item.label}</span>
                )}
                {!collapsed && item.badge && (
                  <span className="bg-[#C9A84C] text-[#1B2A5E] text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                    {item.badge}
                  </span>
                )}
                {/* Tooltip when collapsed */}
                {collapsed && (
                  <div className="absolute left-full ml-2 bg-[#1B2A5E] text-[#F5F2EC] text-xs px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-[#C9A84C]/30">
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle + logout */}
        <div className="border-t border-[#F5F2EC]/10 p-3 space-y-1">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center gap-2 text-[#F5F2EC]/40 hover:text-[#F5F2EC] py-2 text-xs transition-colors"
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            {!collapsed && <span>Colapsar</span>}
          </button>
          <button
            onClick={async () => {
              await fetch("/api/logout", { method: "POST" });
              window.location.href = "/login";
            }}
            className="w-full flex items-center gap-3 text-[#F5F2EC]/40 hover:text-red-400 px-1 py-2 text-sm transition-colors"
          >
            <LogOut size={16} className="shrink-0" />
            {!collapsed && <span>Salir</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-[#EDE9E0] h-16 flex items-center justify-between px-6 shrink-0">
          <h1
            className="text-[#1B2A5E] text-xl"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            {title}
          </h1>
          <div className="flex items-center gap-4">
            <button className="relative text-[#7A7A7A] hover:text-[#1B2A5E] transition-colors">
              <Bell size={18} />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#C9A84C] rounded-full text-[8px] text-[#1B2A5E] font-bold flex items-center justify-center">
                2
              </span>
            </button>
            <div className="flex items-center gap-2 border-l border-[#EDE9E0] pl-4">
              <div className="w-8 h-8 bg-[#1B2A5E] flex items-center justify-center">
                <span className="text-[#C9A84C] text-xs font-bold">
                  {role === "admin" ? "AD" : "EM"}
                </span>
              </div>
              <div className="hidden sm:block">
                <p className="text-[#2C2C2C] text-xs font-semibold">
                  {role === "admin" ? "Administrador" : "Juan Pérez"}
                </p>
                <p className="text-[#7A7A7A] text-xs">
                  {role === "admin" ? "Admin general" : "Restaurador"}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#F5F2EC]">
          {children}
        </main>
      </div>
    </div>
  );
}
