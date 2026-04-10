import React, { useState, useEffect } from "react";
import { useAppStore } from "../../store/useAppStore";
import { AlianzasTab } from "./AlianzasTab";
import { PaisesTab } from "./PaisesTab";
import { GatewaysTab } from "./GatewaysTab";
import { PagadoresTab } from "./PagadoresTab";
import { AlternanciaView } from "./AlternanciaView";
import { GatewayAlternanciaView } from "./GatewayAlternanciaView";
import { DeliveryFlowsView } from "./DeliveryFlowsView";
import { TariffsView } from "../Tariffs/TariffsView";
import { ClientRulesTab } from "./ClientRulesTab";

type Tab = "alianzas" | "paises" | "gateways" | "pagadores" | "alternancia" | "alt-recolectores" | "delivery-flows" | "tarifas" | "client-rules";

const TABS: { key: Tab; label: string }[] = [
  { key: "alianzas",         label: "Alianzas"          },
  { key: "paises",           label: "Países"            },
  { key: "gateways",         label: "Recolectores"      },
  { key: "alt-recolectores", label: "Alt. Recolectores" },
  { key: "delivery-flows",   label: "Flujos de Entrega" },
  { key: "pagadores",        label: "Pagadores"         },
  { key: "alternancia",      label: "Alternancia"       },
  { key: "tarifas",          label: "Tarifas"           },
  { key: "client-rules",    label: "Reglas de Cliente" },
];

const VALID_TABS = TABS.map((t) => t.key);

function getTabFromHash(): Tab {
  const hash = window.location.hash.replace("#tab=", "");
  return VALID_TABS.includes(hash as Tab) ? (hash as Tab) : "alianzas";
}

export const Config = () => {
  const { isLoaded } = useAppStore();
  const [activeTab, setActiveTab] = useState<Tab>(getTabFromHash);

  // Sync tab with URL hash
  useEffect(() => {
    window.location.hash = `tab=${activeTab}`;
  }, [activeTab]);

  // Listen for back/forward navigation
  useEffect(() => {
    const onHashChange = () => setActiveTab(getTabFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const renderContent = () => {
    if (!isLoaded) {
      return (
        <div className="space-y-3 animate-pulse">
          <div className="h-10 bg-gray-100 rounded-lg w-full" />
          <div className="h-10 bg-gray-100 rounded-lg w-5/6" />
          <div className="h-10 bg-gray-100 rounded-lg w-4/6" />
          <div className="h-10 bg-gray-100 rounded-lg w-full" />
          <div className="h-10 bg-gray-100 rounded-lg w-3/4" />
        </div>
      );
    }
    switch (activeTab) {
      case "alianzas":         return <AlianzasTab />;
      case "paises":           return <PaisesTab />;
      case "gateways":         return <GatewaysTab />;
      case "pagadores":        return <PagadoresTab />;
      case "alternancia":      return <AlternanciaView />;
      case "alt-recolectores": return <GatewayAlternanciaView />;
      case "delivery-flows":   return <DeliveryFlowsView />;
      case "tarifas":          return <TariffsView />;
      case "client-rules":    return <ClientRulesTab />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
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

      {renderContent()}
    </div>
  );
};
