import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

export const PageWrapper = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="h-screen overflow-hidden bg-gray-50">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <main
        className="h-screen overflow-y-auto transition-all duration-300"
        style={{ marginLeft: collapsed ? 64 : 256 }}
      >
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
