import React from "react";
import { NavLink } from "react-router-dom";
import { Settings, TrendingUp, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../lib/utils";
import logo from "../../../assets/Full logo Orange con espacio.avif";
import logoIcon from "../../../assets/favicon.jpeg";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  { to: "/configuracion", label: "Configuración",  Icon: Settings   },
  { to: "/tasas",         label: "Tasas de Cambio", Icon: TrendingUp },
  { to: "/clientes",      label: "Clientes",        Icon: Users      },
];

export const Sidebar = ({ collapsed, onToggle }: SidebarProps) => {
  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 bg-sidebar-bg border-r border-gray-800 flex flex-col transition-all duration-300 overflow-visible"
      style={{ width: collapsed ? 64 : 256 }}
    >
      {/* Logo */}
      <div className={`h-16 flex items-center border-b border-gray-800 overflow-hidden flex-shrink-0 ${collapsed ? "justify-center" : "px-4"}`}>
        {collapsed ? (
          <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center overflow-hidden flex-shrink-0">
            <img src={logoIcon} alt="MiPapaya" className="w-full h-full object-contain" />
          </div>
        ) : (
          <img
            src={logo}
            alt="MiPapaya"
            className="h-9 w-auto object-contain"
          />
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4">
        <ul className="space-y-1 px-2">
          {navItems.map(({ to, label, Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                title={collapsed ? label : undefined}
                className={({ isActive }) =>
                  cn(
                    "flex items-center rounded-xl transition-all duration-200 group relative",
                    collapsed ? "justify-center p-0 w-10 h-10 mx-auto" : "px-3 py-2.5 gap-3",
                    isActive
                      ? collapsed
                        ? "bg-papaya-orange"
                        : "bg-papaya-orange text-white"
                      : collapsed
                      ? "text-sidebar-text hover:bg-gray-800"
                      : "text-sidebar-text hover:bg-gray-800 hover:text-white"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={cn(
                        "flex-shrink-0 transition-colors",
                        collapsed ? "w-4 h-4" : "w-5 h-5",
                        isActive ? "text-white" : "text-sidebar-text group-hover:text-white"
                      )}
                    />
                    {!collapsed && (
                      <span className="text-sm font-medium whitespace-nowrap">{label}</span>
                    )}

                    {/* Tooltip when collapsed */}
                    {collapsed && (
                      <span className="pointer-events-none absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-50">
                        {label}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-gray-900 border border-gray-700 flex items-center justify-center text-gray-400 hover:text-white hover:border-gray-500 transition-colors shadow-md z-50"
        aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
      >
        {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
      </button>
    </aside>
  );
};
