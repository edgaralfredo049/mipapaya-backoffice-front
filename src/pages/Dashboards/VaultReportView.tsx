import React, { useState, useEffect } from "react";
import { api } from "../../api";
import { ShieldAlert, Users, ArrowUpRight, RefreshCw, Loader2 } from "lucide-react";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function firstDayOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export const VaultReportView: React.FC = () => {
  const [dateFrom, setDateFrom] = useState(firstDayOfMonth());
  const [dateTo,   setDateTo]   = useState(todayStr());
  const [data,     setData]     = useState<{ new_client: number; alerts: number; manual: number } | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      const res = await api.getVaultLogSummary(
        dateFrom ? `${dateFrom} 00:00:00` : undefined,
        dateTo   ? `${dateTo} 23:59:59`   : undefined,
      );
      setData(res);
    } catch (e: any) {
      setError(e?.message ?? "Error al cargar reporte");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const total = (data?.new_client ?? 0) + (data?.alerts ?? 0) + (data?.manual ?? 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">Reporte de Bóveda</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Escalaciones a Cumplimiento por tipo en el período seleccionado
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-sm font-medium text-gray-700">Desde:</label>
        <input
          type="date" value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:border-papaya-orange"
        />
        <label className="text-sm font-medium text-gray-700">Hasta:</label>
        <input
          type="date" value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:border-papaya-orange"
        />
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Aplicar
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<Users size={20} className="text-purple-500" />}
          label="Clientes nuevos → Cumplimiento"
          value={data?.new_client ?? 0}
          total={total}
          color="purple"
          description="Primera remesa de un cliente, evaluada por cumplimiento antes de liberar"
        />
        <StatCard
          icon={<ShieldAlert size={20} className="text-amber-500" />}
          label="Escaladas por Operaciones (alertas)"
          value={data?.alerts ?? 0}
          total={total}
          color="amber"
          description="Operaciones escaló una remesa con alertas a cumplimiento"
        />
        <StatCard
          icon={<ArrowUpRight size={20} className="text-blue-500" />}
          label="Movimientos manuales"
          value={data?.manual ?? 0}
          total={total}
          color="blue"
          description="Cambios de bóveda realizados manualmente"
        />
      </div>

      {/* Total */}
      {data && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 px-5 py-4 flex items-center justify-between">
          <span className="text-sm text-gray-600 font-medium">Total escalaciones en el período</span>
          <span className="text-2xl font-bold text-gray-900">{total}</span>
        </div>
      )}
    </div>
  );
};

function StatCard({
  icon, label, value, total, color, description,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  total: number;
  color: "purple" | "amber" | "blue";
  description: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const barColor = {
    purple: "bg-purple-400",
    amber:  "bg-amber-400",
    blue:   "bg-blue-400",
  }[color];
  const bgColor = {
    purple: "bg-purple-50 border-purple-100",
    amber:  "bg-amber-50 border-amber-100",
    blue:   "bg-blue-50 border-blue-100",
  }[color];

  return (
    <div className={`rounded-xl border p-5 space-y-3 ${bgColor}`}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-semibold text-gray-600 leading-tight">{label}</span>
      </div>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-gray-500">
          <span>{description}</span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}
