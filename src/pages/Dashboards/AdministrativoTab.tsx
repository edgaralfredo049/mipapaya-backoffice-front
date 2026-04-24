import React, { useState, useEffect, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { api, DashboardAdmin, DashboardPieSlice } from "../../api";
import { Search, X, AlertCircle, Download } from "lucide-react";

const ORANGE   = "#f97316";
const GREEN    = "#22c55e";
const BLUE     = "#3b82f6";
const GRAY     = "#6b7280";
const YELLOW   = "#eab308";
const WA_GREEN = "#25d366";

const PIE_COLORS_RECOLECCION: Record<string, string> = {
  "Wire Transfer": BLUE, "Debit Card": GREEN, "Cash": ORANGE, "Credit Card": YELLOW,
};
const PIE_COLORS_PAGO: Record<string, string> = {
  "Cash": BLUE, "Mobile Payment": ORANGE, "Bank Transfer": GRAY,
};

// ── helpers ───────────────────────────────────────────────────────────────────
function todayNY() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" }); // YYYY-MM-DD
}
function monthStartNY() {
  const d = new Date();
  const ny = new Date(d.toLocaleString("en-US", { timeZone: "America/New_York" }));
  return `${ny.getFullYear()}-${String(ny.getMonth() + 1).padStart(2, "0")}-01`;
}
function fmtDisplay(iso: string) {
  const [, m, d] = iso.split("-");
  return `${parseInt(m)}/${parseInt(d)}`;
}
function money(n: number) { return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 }); }
function varColor(v: number) { return v > 0 ? "text-green-600" : v < 0 ? "text-red-500" : "text-gray-400"; }

const inp = "rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:border-papaya-orange focus:outline-none bg-white";

// ── micro-UI ──────────────────────────────────────────────────────────────────
const TH = ({ c, right }: { c: React.ReactNode; right?: boolean }) => (
  <th className={`px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap border-b border-gray-200 ${right ? "text-right" : "text-left"}`}>{c}</th>
);
const TD = ({ c, right, cls = "" }: { c: React.ReactNode; right?: boolean; cls?: string }) => (
  <td className={`px-3 py-1.5 text-sm whitespace-nowrap ${right ? "text-right" : "text-left"} ${cls}`}>{c}</td>
);
function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
        <div className="w-1 h-4 rounded-full bg-orange-500" />
        <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
function MiniDonut({ data, title, colorMap }: { data: DashboardPieSlice[]; title: string; colorMap: Record<string, string> }) {
  return (
    <div className="flex flex-col items-center flex-shrink-0" style={{ width: 300 }}>
      <p className="text-sm font-semibold text-gray-600 mb-1">{title}</p>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart margin={{ top: 10, right: 10, bottom: 0, left: 10 }}>
          <Pie
            data={data} cx="50%" cy="40%"
            innerRadius={45} outerRadius={82}
            dataKey="value"
            label={({ value }) => value > 0 ? `${value}%` : ""}
            labelLine={false}
            fontSize={12}
          >
            {data.map((e, i) => <Cell key={i} fill={colorMap[e.name] ?? GRAY} />)}
          </Pie>
          <Tooltip formatter={(v) => `${v}%`} />
          <Legend
            iconSize={10}
            iconType="circle"
            layout="horizontal"
            verticalAlign="bottom"
            align="center"
            wrapperStyle={{ fontSize: 11, paddingTop: 12, lineHeight: "20px" }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
function Skeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-100 rounded-lg" />)}
    </div>
  );
}

// ── componente principal ──────────────────────────────────────────────────────
export const AdministrativoTab = () => {
  const [dateFrom, setDateFrom] = useState(monthStartNY());
  const [dateTo,   setDateTo]   = useState(todayNY());
  const [filterError, setFilterError] = useState<string | null>(null);
  const [data, setData]       = useState<DashboardAdmin | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const validate = (from: string, to: string): string | null => {
    if (!from || !to)        return "Ambas fechas son requeridas";
    if (from > to)           return "La fecha inicio no puede ser posterior a la fecha fin";
    if (to > todayNY())      return "La fecha fin no puede ser una fecha futura";
    return null;
  };

  const load = useCallback(async (from: string, to: string) => {
    const err = validate(from, to);
    if (err) { setFilterError(err); return; }
    setFilterError(null);
    setLoading(true);
    setError(null);
    try {
      const res = await api.getDashboardAdmin(from, to);
      setData(res);
    } catch (e: any) {
      setError(e.message ?? "Error cargando datos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(dateFrom, dateTo); }, []); // solo al montar

  const handleExport = async () => {
    const err = validate(dateFrom, dateTo);
    if (err) { setFilterError(err); return; }
    setExporting(true);
    try {
      const params  = new URLSearchParams({ date_from: dateFrom, date_to: dateTo });
      const apiBase = (import.meta as any).env?.VITE_API_URL ?? "";
      const apiKey  = (import.meta as any).env?.VITE_API_KEY  ?? "";
      const res = await fetch(`${apiBase}/api/dashboard/admin/export?${params}`, {
        headers: { "X-API-Key": apiKey },
      });
      if (!res.ok) throw new Error("Error generando el reporte");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `transacciones_${dateFrom}_${dateTo}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message ?? "Error al exportar");
    } finally {
      setExporting(false);
    }
  };

  const kpis = data?.kpis;
  const rangeLabel = data
    ? new Date(data.date_from + "T12:00:00").toLocaleString("es", { month: "long", year: "numeric" })
    : "";

  // KPI table rows
  const carteraRows = kpis ? [
    { label: "Registros",       hoy: kpis.registros_hoy, ayer: kpis.registros_ayer },
    { label: "Clientes Nuevos", hoy: kpis.nuevos_hoy,    ayer: kpis.nuevos_ayer    },
  ] : [];
  const operRows = kpis ? [
    { label: "Transacciones",   hoy: kpis.txn_hoy,    ayer: kpis.txn_ayer,    fmt: (v: number) => String(Math.round(v)) },
    { label: "Monto Transado",  hoy: kpis.monto_hoy,  ayer: kpis.monto_ayer,  fmt: money },
    { label: "Ticket Promedio", hoy: kpis.ticket_hoy, ayer: kpis.ticket_ayer, fmt: (v: number) => "$" + v.toFixed(1) },
  ] : [];

  return (
    <div className="space-y-3 text-gray-800">

      {/* ── Filtros ── */}
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
            onClick={() => load(dateFrom, dateTo)}
            disabled={loading || !!filterError}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-papaya-orange text-white text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
          >
            <Search size={14} /> Consultar
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || !!filterError}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Download size={14} className={exporting ? "animate-bounce" : ""} />
            {exporting ? "Generando..." : "Exportar Excel"}
          </button>
          <button
            onClick={() => { setDateFrom(monthStartNY()); setDateTo(todayNY()); setFilterError(null); }}
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <X size={12} /> Limpiar
          </button>
        </div>
        {filterError && (
          <span className="flex items-center gap-1 text-xs text-red-600 w-full">
            <AlertCircle size={12} /> {filterError}
          </span>
        )}
      </div>

      {/* ── Error API ── */}
      {error && (
        <div className="px-4 py-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl">
          {error}
        </div>
      )}

      {loading ? <Skeleton /> : !data ? null : (
        <>
          {/* 1 ── Canales (vista más general) */}
          <Block title={`Canal utilizado — ${rangeLabel}`}>
            <div className="flex gap-4">
              {[
                { label: "Chatbot Landing", pct: data.canales.chatbot_landing, color: ORANGE,    letter: "C" },
                { label: "WhatsApp",        pct: data.canales.whatsapp,        color: WA_GREEN,  letter: "W" },
              ].map(c => (
                <div key={c.label}
                  className="flex-1 flex items-center gap-4 bg-gray-50 rounded-xl px-5 py-4 border border-gray-100"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-base font-bold flex-shrink-0"
                    style={{ background: c.color }}>
                    {c.letter}
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-800">{c.pct.toFixed(2)}%</div>
                    <div className="text-xs text-gray-500 font-medium mt-0.5">{c.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </Block>

          {/* 2 ── KPIs diarios */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            <Block title="Cartera de Clientes">
              <table className="w-full">
                <thead><tr>
                  <TH c="" /><TH c={fmtDisplay(data.date_to)} right /><TH c={fmtDisplay(kpis!.date_ayer)} right />
                  <TH c="Variación" right />
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {carteraRows.map(r => {
                    const v = r.hoy - r.ayer;
                    return (
                      <tr key={r.label} className="hover:bg-gray-50">
                        <TD c={r.label} cls="font-medium text-gray-700" />
                        <TD c={r.hoy} right cls="font-semibold" />
                        <TD c={r.ayer} right cls="text-gray-400" />
                        <TD c={`${v > 0 ? "+" : ""}${v}`} right cls={varColor(v) + " font-semibold"} />
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Block>

            <Block title="Operación">
              <table className="w-full">
                <thead><tr>
                  <TH c="" /><TH c={fmtDisplay(data.date_to)} right /><TH c={fmtDisplay(kpis!.date_ayer)} right />
                  <TH c="Variación" right />
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {operRows.map(r => {
                    const v = r.hoy - r.ayer;
                    return (
                      <tr key={r.label} className="hover:bg-gray-50">
                        <TD c={r.label} cls="font-medium text-gray-700" />
                        <TD c={r.fmt(r.hoy)} right cls="font-semibold" />
                        <TD c={r.fmt(r.ayer)} right cls="text-gray-400" />
                        <TD c={`${v > 0 ? "+" : ""}${r.fmt(v)}`} right cls={varColor(v) + " font-semibold"} />
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Block>
          </div>

          {/* 3 ── Tendencias */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            <Block title="Transacciones Pagadas — período seleccionado">
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <ResponsiveContainer width="100%" height={210}>
                  <LineChart data={data.txn_paid_31d} margin={{ top: 18, right: 12, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="fecha" tick={{ fontSize: 11 }} interval={Math.max(0, Math.floor(data.txn_paid_31d.length / 10))} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: 6, fontSize: 12 }} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="value" stroke={BLUE} strokeWidth={2}
                      dot={{ r: 3, fill: BLUE }} name="Transacciones"
                      label={{ position: "top", fontSize: 11, fill: "#6b7280" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Block>

            <Block title="Registros en Plataforma">
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <ResponsiveContainer width="100%" height={210}>
                  <LineChart data={data.registros_plataforma} margin={{ top: 18, right: 12, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="fecha" tick={{ fontSize: 11 }} interval={Math.max(0, Math.floor(data.registros_plataforma.length / 10))} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: 6, fontSize: 12 }} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="actual"   stroke={GREEN}  strokeWidth={2} dot={{ r: 3 }}
                      name="Diario" label={{ position: "top", fontSize: 11 }} />
                    <Line type="monotone" dataKey="promedio" stroke={ORANGE} strokeWidth={2} dot={false} name="Promedio" />
                    <Line type="monotone" dataKey="meta"     stroke={BLUE}   strokeWidth={2} dot={false} name="Meta" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Block>
          </div>

          {/* 4 ── Desglose por país emisor */}
          <Block title="País emisor — acumulado período">
            <div className="flex gap-4">
              <div className="flex-1 overflow-x-auto">
                <table className="w-full">
                  <thead><tr>
                    <TH c="País" /><TH c="Registros" right /><TH c="Cli. Nuevos" right />
                    <TH c="Txn" right /><TH c="Monto" right /><TH c="Ticket" right />
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.emisor.map(r => (
                      <tr key={r.pais} className={`hover:bg-gray-50 ${r.txn === 0 && r.registros === 0 ? "opacity-35" : ""}`}>
                        <TD c={r.pais} cls="font-medium" />
                        <TD c={r.registros} right />
                        <TD c={r.nuevos} right />
                        <TD c={r.txn} right />
                        <TD c={r.monto > 0 ? money(r.monto) : "$0"} right />
                        <TD c={r.ticket > 0 ? "$" + r.ticket.toFixed(1) : "$0.0"} right />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {data.metodo_recoleccion.length > 0 && (
                <MiniDonut data={data.metodo_recoleccion} title="Método de Recolección" colorMap={PIE_COLORS_RECOLECCION} />
              )}
            </div>
          </Block>

          {/* 5 ── Desglose por país receptor */}
          <Block title="País receptor — acumulado período">
            <div className="flex gap-4">
              <div className="flex-1 overflow-x-auto">
                <table className="w-full">
                  <thead><tr>
                    <TH c="País" /><TH c="Txn" right /><TH c="Monto" right /><TH c="Ticket" right />
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.receptor.map(r => (
                      <tr key={r.pais} className={`hover:bg-gray-50 ${r.txn === 0 ? "opacity-35" : ""}`}>
                        <TD c={r.pais} cls="font-medium" />
                        <TD c={r.txn} right />
                        <TD c={r.monto > 0 ? money(r.monto) : "$0"} right />
                        <TD c={r.ticket > 0 ? "$" + r.ticket.toFixed(1) : "$0.0"} right />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {data.metodo_pago.length > 0 && (
                <MiniDonut data={data.metodo_pago} title="Método de Pago" colorMap={PIE_COLORS_PAGO} />
              )}
            </div>
          </Block>
        </>
      )}
    </div>
  );
};
