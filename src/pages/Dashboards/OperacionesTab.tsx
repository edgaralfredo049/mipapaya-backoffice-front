import React, { useState, useCallback } from "react";
import { Search, X, Loader2 } from "lucide-react";

function todayNY() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}
function monthStartNY() {
  const d = new Date();
  const ny = new Date(d.toLocaleString("en-US", { timeZone: "America/New_York" }));
  return `${ny.getFullYear()}-${String(ny.getMonth() + 1).padStart(2, "0")}-01`;
}

const inp = "rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:border-papaya-orange focus:outline-none bg-white";

export const OperacionesTab = () => {
  const [dateFrom, setDateFrom] = useState(monthStartNY());
  const [dateTo,   setDateTo]   = useState(todayNY());
  const [loading,  setLoading]  = useState(false);

  const handleConsultar = useCallback(async () => {
    setLoading(true);
    // placeholder — integrar datos cuando estén listos
    await new Promise(r => setTimeout(r, 500));
    setLoading(false);
  }, [dateFrom, dateTo]);

  return (
    <div className="space-y-3 text-gray-800">

      {/* Filtros */}
      <div className="sticky top-8 z-10 bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Fecha desde</label>
          <input
            type="date"
            className={inp}
            value={dateFrom}
            max={dateTo || todayNY()}
            onChange={e => setDateFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Fecha hasta</label>
          <input
            type="date"
            className={inp}
            value={dateTo}
            min={dateFrom}
            max={todayNY()}
            onChange={e => setDateTo(e.target.value)}
          />
        </div>
        <div className="flex items-end gap-2">
          <button
            onClick={handleConsultar}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-papaya-orange text-white text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            Consultar
          </button>
          <button
            onClick={() => { setDateFrom(monthStartNY()); setDateTo(todayNY()); }}
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <X size={12} /> Limpiar
          </button>
        </div>
      </div>

      {/* Contenido — próximamente */}
      <div className="flex items-center justify-center h-64 text-gray-300 text-sm border border-dashed border-gray-200 rounded-xl">
        Gráficos y métricas de operaciones — próximamente
      </div>
    </div>
  );
};
