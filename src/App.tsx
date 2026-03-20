import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAppStore } from "./store/useAppStore";
import { PageWrapper } from "./components/layout/PageWrapper";
import { Config } from "./pages/Config/Config";
import { RatesView } from "./pages/Rates/RatesView";
import { ClientsView } from "./pages/Clients/ClientsView";
import { ClientDetailView } from "./pages/Clients/ClientDetailView";

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
        </Route>
        <Route path="*" element={<Navigate to="/configuracion" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
