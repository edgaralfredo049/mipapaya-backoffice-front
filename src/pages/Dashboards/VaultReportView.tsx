import React, { useState, useEffect } from "react";
import { api } from "../../api";
import { Users, ShieldAlert, CheckCircle2, XCircle, RefreshCw, Loader2 } from "lucide-react";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function firstDayOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

type Summary = { new_clients: number; escalated: number; approved: number; rejected: number };

export const VaultReportView: React.FC = () => {
  const [dateFrom, setDateFrom] = useState(firstDayOfMonth());
  const [dateTo,   setDateTo]   = useState(todayStr());
  const [data,     setData]     = useState<Summary | null>(null);
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">Reporte de Bóveda</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Actividad de cumplimiento en el período seleccionado
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
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={<Users size={20} className="text-purple-500" />}
          label="Nuevos clientes registrados"
          value={data?.new_clients ?? 0}
          color="purple"
          description="Clientes registrados en el período"
        />
        <StatCard
          icon={<ShieldAlert size={20} className="text-amber-500" />}
          label="Escaladas a Cumplimiento"
          value={data?.escalated ?? 0}
          color="amber"
          description="Remesas enviadas a bóveda de Cumplimiento"
        />
        <StatCard
          icon={<CheckCircle2 size={20} className="text-green-500" />}
          label="Aprobadas"
          value={data?.approved ?? 0}
          color="green"
          description="Remesas aprobadas y devueltas a Operaciones"
        />
        <StatCard
          icon={<XCircle size={20} className="text-red-500" />}
          label="Rechazadas"
          value={data?.rejected ?? 0}
          color="red"
          description="Remesas canceladas desde Cumplimiento"
        />
      </div>
    </div>
  );
};

function StatCard({
  icon, label, value, color, description,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: "purple" | "amber" | "green" | "red";
  description: string;
}) {
  const bgColor = {
    purple: "bg-purple-50 border-purple-100",
    amber:  "bg-amber-50 border-amber-100",
    green:  "bg-green-50 border-green-100",
    red:    "bg-red-50 border-red-100",
  }[color];

  return (
    <div className={`rounded-xl border p-5 space-y-3 ${bgColor}`}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-semibold text-gray-600 leading-tight">{label}</span>
      </div>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      <p className="text-[11px] text-gray-500">{description}</p>
    </div>
  );
}
