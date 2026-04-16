import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Settings, TrendingUp, Users, ArrowLeftRight,
  LayoutDashboard, ChevronLeft, ChevronRight, HelpCircle,
  UserCog, LogOut,
} from "lucide-react";
import { cn } from "../../lib/utils";
import logo from "../../../assets/Full logo Orange con espacio.avif";
import logoIcon from "../../../assets/favicon.jpeg";
import { api } from "../../api";
import { useAuthStore } from "../../store/useAuthStore";

interface SidebarProps {
  collapsed: boolean;
  onToggle:  () => void;
}

interface NavItem {
  to:           string;
  label:        string;
  Icon:         React.ElementType;
  permission:   string;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/dashboards",    label: "Dashboards",      Icon: LayoutDashboard, permission: "dashboard_ops" },
  { to: "/configuracion", label: "Configuración",   Icon: Settings,        permission: "configuracion" },
  { to: "/tasas",         label: "Tasas de Cambio", Icon: TrendingUp,      permission: "tasas"         },
  { to: "/clientes",      label: "Clientes",        Icon: Users,           permission: "clientes"      },
  { to: "/remesas",       label: "Remesas",         Icon: ArrowLeftRight,  permission: "remesas"       },
  { to: "/soporte",       label: "Soporte",         Icon: HelpCircle,      permission: "soporte"       },
  { to: "/usuarios",      label: "Usuarios",        Icon: UserCog,         permission: "usuarios"      },
];

export const Sidebar = ({ collapsed, onToggle }: SidebarProps) => {
  const { hasPermission, user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const fetch = () => {
      api.getHandoffPendingCount().then(r => setPendingCount(r.count)).catch(() => {});
    };
    fetch();
    const id = setInterval(fetch, 30_000);
    return () => clearInterval(id);
  }, []);

  const visibleItems = NAV_ITEMS.filter(item => hasPermission(item.permission));

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

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
          <img src={logo} alt="MiPapaya" className="h-9 w-auto object-contain" />
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {visibleItems.map(({ to, label, Icon, permission }) => {
            const showBadge = to === "/soporte" && pendingCount > 0;
            return (
              <li key={to}>
                <NavLink
                  to={to}
                  title={collapsed ? label : undefined}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center rounded-xl transition-all duration-200 group relative",
                      collapsed ? "justify-center p-0 w-10 h-10 mx-auto" : "px-3 py-2.5 gap-3",
                      isActive
                        ? collapsed ? "bg-papaya-orange" : "bg-papaya-orange text-white"
                        : collapsed
                        ? "text-sidebar-text hover:bg-gray-800"
                        : "text-sidebar-text hover:bg-gray-800 hover:text-white"
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className="relative flex-shrink-0">
                        <Icon
                          className={cn(
                            "transition-colors",
                            collapsed ? "w-4 h-4" : "w-5 h-5",
                            isActive ? "text-white" : "text-sidebar-text group-hover:text-white"
                          )}
                        />
                        {showBadge && (
                          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                            {pendingCount > 99 ? "99+" : pendingCount}
                          </span>
                        )}
                      </span>
                      {!collapsed && (
                        <span className="flex-1 text-sm font-medium whitespace-nowrap flex items-center justify-between">
                          {label}
                          {showBadge && (
                            <span className="ml-2 min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                              {pendingCount > 99 ? "99+" : pendingCount}
                            </span>
                          )}
                        </span>
                      )}
                      {collapsed && (
                        <span className="pointer-events-none absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-50">
                          {label}{showBadge ? ` (${pendingCount})` : ""}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User info + logout */}
      <div className={`border-t border-gray-800 py-3 ${collapsed ? "px-2" : "px-3"}`}>
        {!collapsed && user && (
          <div className="mb-2 px-1">
            <p className="text-xs font-medium text-white truncate">{user.name || user.email}</p>
            <p className="text-[10px] text-gray-500 capitalize">{user.role}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          title={collapsed ? "Cerrar sesión" : undefined}
          className={cn(
            "flex items-center rounded-xl text-sidebar-text hover:bg-gray-800 hover:text-white transition-all group relative w-full",
            collapsed ? "justify-center p-0 w-10 h-10 mx-auto" : "px-3 py-2 gap-3"
          )}
        >
          <LogOut className={cn("transition-colors", collapsed ? "w-4 h-4" : "w-4 h-4")} />
          {!collapsed && <span className="text-sm font-medium">Cerrar sesión</span>}
          {collapsed && (
            <span className="pointer-events-none absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-50">
              Cerrar sesión
            </span>
          )}
        </button>
      </div>

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
