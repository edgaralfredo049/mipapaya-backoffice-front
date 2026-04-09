import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAppStore } from "./store/useAppStore";
import { PageWrapper } from "./components/layout/PageWrapper";
import { Config } from "./pages/Config/Config";
import { RatesView } from "./pages/Rates/RatesView";
import { ClientsView } from "./pages/Clients/ClientsView";
import { ClientDetailView } from "./pages/Clients/ClientDetailView";
import { RemittancesView } from "./pages/Remittances/RemittancesView";
import { RemittanceDetailView } from "./pages/Remittances/RemittanceDetailView";
import { Dashboards } from "./pages/Dashboards/Dashboards";
import { HumanHandoffView } from "./pages/Handoff/HumanHandoffView";

export default function App() {
  const { init, isLoaded } = useAppStore();

  React.useEffect(() => {
    init();
  }, [init]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-papaya-orange font-medium animate-pulse">Cargando datos...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PageWrapper />}>
          <Route index element={<Navigate to="/configuracion" replace />} />
          <Route path="configuracion" element={<Config />} />
          <Route path="tasas" element={<RatesView />} />
          <Route path="clientes" element={<ClientsView />} />
          <Route path="clientes/:id" element={<ClientDetailView />} />
          <Route path="remesas" element={<RemittancesView />} />
          <Route path="remesas/:id" element={<RemittanceDetailView />} />
          <Route path="dashboards" element={<Dashboards />} />
          <Route path="soporte" element={<HumanHandoffView />} />
        </Route>
        <Route path="*" element={<Navigate to="/configuracion" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
