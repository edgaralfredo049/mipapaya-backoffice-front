import React, { useState, useEffect } from "react";
import { AdministrativoTab } from "./AdministrativoTab";
import { CumplimientoTab } from "./CumplimientoTab";
import { OperacionesTab } from "./OperacionesTab";

type Tab = "administrativo" | "cumplimiento" | "operaciones";

const TABS: { key: Tab; label: string }[] = [
  { key: "administrativo", label: "Administrativo" },
  { key: "cumplimiento",   label: "Cumplimiento"   },
  { key: "operaciones",    label: "Operaciones"    },
];

const VALID_TABS = TABS.map((t) => t.key);

function getTabFromHash(): Tab {
  const hash = window.location.hash.replace("#tab=", "");
  return VALID_TABS.includes(hash as Tab) ? (hash as Tab) : "administrativo";
}

export const Dashboards = () => {
  const [activeTab, setActiveTab] = useState<Tab>(getTabFromHash);

  useEffect(() => {
    window.location.hash = `tab=${activeTab}`;
  }, [activeTab]);

  useEffect(() => {
    const onHashChange = () => setActiveTab(getTabFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case "administrativo": return <AdministrativoTab />;
      case "cumplimiento":   return <CumplimientoTab />;
      case "operaciones":    return <OperacionesTab />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboards</h1>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-1">
          {TABS.map(({ key, label }) => (
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

      {/* Content */}
      <div>{renderContent()}</div>
    </div>
  );
};
