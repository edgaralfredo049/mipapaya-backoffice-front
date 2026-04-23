import React, { useState, useEffect } from "react";
import { useAuthStore } from "../../store/useAuthStore";
import { AdministrativoTab } from "./AdministrativoTab";
import { CumplimientoTab } from "./CumplimientoTab";
import { OperacionesTab } from "./OperacionesTab";

type Tab = "administrativo" | "cumplimiento" | "operaciones";

const ALL_TABS: { key: Tab; label: string; permission: string }[] = [
  { key: "administrativo", label: "Administrativo",  permission: "dashboard_admin"          },
  { key: "operaciones",    label: "Operaciones",     permission: "dashboard_ops"            },
  { key: "cumplimiento",   label: "Cumplimiento",    permission: "dashboard_cumplimiento"   },
];

export const Dashboards = () => {
  const hasPermission = useAuthStore(s => s.hasPermission);
  const visibleTabs   = ALL_TABS.filter(t => hasPermission(t.permission));

  const getInitialTab = (): Tab => {
    const hash = window.location.hash.replace("#tab=", "") as Tab;
    if (visibleTabs.some(t => t.key === hash)) return hash;
    return visibleTabs[0]?.key ?? "administrativo";
  };

  const [activeTab, setActiveTab] = useState<Tab>(getInitialTab);

  useEffect(() => {
    window.location.hash = `tab=${activeTab}`;
  }, [activeTab]);

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace("#tab=", "") as Tab;
      if (visibleTabs.some(t => t.key === hash)) setActiveTab(hash);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [visibleTabs]);

  // If active tab lost permission, switch to first visible
  useEffect(() => {
    if (!visibleTabs.some(t => t.key === activeTab) && visibleTabs.length > 0) {
      setActiveTab(visibleTabs[0].key);
    }
  }, [visibleTabs, activeTab]);

  const renderContent = () => {
    switch (activeTab) {
      case "administrativo": return <AdministrativoTab />;
      case "cumplimiento":   return <CumplimientoTab />;
      case "operaciones":    return <OperacionesTab />;
    }
  };

  if (visibleTabs.length === 0) {
    return (
      <div className="p-6 text-sm text-gray-400">Sin acceso a ningún dashboard.</div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboards</h1>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-1">
          {visibleTabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                activeTab === key
                  ? "border-papaya-orange text-papaya-orange"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      <div>{renderContent()}</div>
    </div>
  );
};
