import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAppStore } from "./store/useAppStore";
import { useAuthStore } from "./store/useAuthStore";
import { PageWrapper } from "./components/layout/PageWrapper";
import { LoginView } from "./pages/Login/LoginView";
import { Config } from "./pages/Config/Config";
import { RatesView } from "./pages/Rates/RatesView";
import { ClientsView } from "./pages/Clients/ClientsView";
import { ClientDetailView } from "./pages/Clients/ClientDetailView";
import { RemittancesView } from "./pages/Remittances/RemittancesView";
import { RemittanceDetailView } from "./pages/Remittances/RemittanceDetailView";
import { Dashboards } from "./pages/Dashboards/Dashboards";
import { HumanHandoffView } from "./pages/Handoff/HumanHandoffView";
import { UsersView } from "./pages/Users/UsersView";
import { RolesView } from "./pages/Users/RolesView";

/** Redirige a /login si no autenticado. */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/** Redirige a la primera ruta permitida si el usuario no tiene permiso. */
function RequirePermission({
  id,
  anyOf,
  write = false,
  children,
}: {
  id?: string;
  anyOf?: string[];
  write?: boolean;
  children: React.ReactNode;
}) {
  const hasPermission = useAuthStore(s => s.hasPermission);
  const allowed = anyOf
    ? anyOf.some(p => hasPermission(p, write))
    : hasPermission(id!, write);
  if (!allowed) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  const { init, isLoaded } = useAppStore();
  const isAuthenticated    = useAuthStore(s => s.isAuthenticated);

  React.useEffect(() => {
    if (isAuthenticated) init();
  }, [init, isAuthenticated]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta pública */}
        <Route path="/login" element={<LoginView />} />

        {/* Rutas protegidas */}
        <Route
          path="/"
          element={
            <RequireAuth>
              {isLoaded ? (
                <PageWrapper />
              ) : (
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                  <div className="text-papaya-orange font-medium animate-pulse">Cargando…</div>
                </div>
              )}
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/dashboards" replace />} />

          <Route
            path="dashboards"
            element={
              <RequirePermission anyOf={["dashboard_admin", "dashboard_ops", "dashboard_cumplimiento"]}>
                <Dashboards />
              </RequirePermission>
            }
          />
          <Route
            path="configuracion"
            element={
              <RequirePermission id="configuracion">
                <Config />
              </RequirePermission>
            }
          />
          <Route
            path="tasas"
            element={
              <RequirePermission id="tasas">
                <RatesView />
              </RequirePermission>
            }
          />
          <Route
            path="clientes"
            element={
              <RequirePermission id="clientes">
                <ClientsView />
              </RequirePermission>
            }
          />
          <Route
            path="clientes/:id"
            element={
              <RequirePermission id="clientes">
                <ClientDetailView />
              </RequirePermission>
            }
          />
          <Route
            path="remesas"
            element={
              <RequirePermission id="remesas">
                <RemittancesView />
              </RequirePermission>
            }
          />
          <Route
            path="remesas/:id"
            element={
              <RequirePermission id="remesas">
                <RemittanceDetailView />
              </RequirePermission>
            }
          />
          <Route
            path="soporte"
            element={
              <RequirePermission id="soporte">
                <HumanHandoffView />
              </RequirePermission>
            }
          />
          <Route
            path="usuarios"
            element={
              <RequirePermission id="usuarios">
                <UsersView />
              </RequirePermission>
            }
          />
          <Route
            path="usuarios/roles"
            element={
              <RequirePermission id="usuarios">
                <RolesView />
              </RequirePermission>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
