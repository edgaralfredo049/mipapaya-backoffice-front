import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Users, UserX, ShieldAlert, Clock, CheckCircle2, XCircle,
  RefreshCw, Loader2,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { api } from "../../api";

/* ── helpers ─────────────────────────────────────────────── */
function todayStr()       { return new Date().toISOString().slice(0, 10); }
function firstDayOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function fmtDateNY(s: string | null) {
  if (!s) return "—";
  const iso = s.includes("T") ? s : s.replace(" ", "T") + "Z";
  return new Date(iso).toLocaleString("es", { timeZone: "America/New_York", dateStyle: "short", timeStyle: "short" });
}
function flag(code: string | null) {
  if (!code || code.length !== 2) return "🌐";
  return [...code.toUpperCase()].map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join("");
}

const PHONE_PREFIXES: Record<string, { code: string; name: string }> = {
  "502": { code: "GT", name: "Guatemala" },   "503": { code: "SV", name: "El Salvador" },
  "504": { code: "HN", name: "Honduras" },    "505": { code: "NI", name: "Nicaragua" },
  "506": { code: "CR", name: "Costa Rica" },  "507": { code: "PA", name: "Panamá" },
  "509": { code: "HT", name: "Haití" },       "591": { code: "BO", name: "Bolivia" },
  "593": { code: "EC", name: "Ecuador" },     "595": { code: "PY", name: "Paraguay" },
  "598": { code: "UY", name: "Uruguay" },
  "57":  { code: "CO", name: "Colombia" },    "58":  { code: "VE", name: "Venezuela" },
  "51":  { code: "PE", name: "Perú" },        "52":  { code: "MX", name: "México" },
  "53":  { code: "CU", name: "Cuba" },        "54":  { code: "AR", name: "Argentina" },
  "55":  { code: "BR", name: "Brasil" },      "56":  { code: "CL", name: "Chile" },
  "34":  { code: "ES", name: "España" },      "44":  { code: "GB", name: "Reino Unido" },
  "49":  { code: "DE", name: "Alemania" },    "33":  { code: "FR", name: "Francia" },
  "39":  { code: "IT", name: "Italia" },      "1":   { code: "US", name: "Estados Unidos" },
};
function phoneToCountry(phone: string): { code: string; name: string } {
  const digits = phone.replace(/^\+/, "");
  for (const len of [3, 2, 1]) {
    const key = digits.slice(0, len);
    if (PHONE_PREFIXES[key]) return PHONE_PREFIXES[key];
  }
  return { code: "??", name: "Desconocido" };
}
function fmtUSD(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

/* ── types ──────────────────────────────────────────────── */
type Summary = { new_clients: number; high_risk_clients: number; escalated: number; pending_compliance: number; approved: number; rejected: number; canceled_other_areas: number };
type Client  = { id: number; name: string; phone: string; email: string | null; country: string | null; country_name: string | null; active: boolean; created_at: string };
type EscRem  = { id: string; escalated_at: string; client_name: string | null; client_phone: string | null; origin_country_id: string | null; origin_country: string | null; destination_country: string | null; sent_amount_usd: number | null; status: string; vault: string };
type ChartItem = { country_id: string; country_name: string; count?: number; amount_usd?: number };

const STATUS_COLORS: Record<string, string> = {
  pending:    "bg-yellow-50 text-yellow-700",
  canceled:   "bg-gray-100 text-gray-500",
  payed:      "bg-green-50 text-green-700",
  transmited: "bg-blue-50 text-blue-700",
};
const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente", canceled: "Cancelada", payed: "Pagada", transmited: "Transmitida",
};

/* ── main component ──────────────────────────────────────── */
export const VaultReportView: React.FC = () => {
  const [dateFrom, setDateFrom] = useState(firstDayOfMonth());
  const [dateTo,   setDateTo]   = useState(todayStr());
  const [summary,  setSummary]  = useState<Summary | null>(null);
  const [clients,  setClients]  = useState<Client[]>([]);
  const [remesas,  setRemesas]  = useState<EscRem[]>([]);
  const [barData,  setBarData]  = useState<ChartItem[]>([]);
  const [lineData, setLineData] = useState<ChartItem[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [tab,      setTab]      = useState<"clientes" | "remesas">("clientes");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const from = dateFrom ? `${dateFrom} 00:00:00` : undefined;
    const to   = dateTo   ? `${dateTo} 23:59:59`   : undefined;
    try {
      const [s, cl, rm, ch] = await Promise.all([
        api.getVaultLogSummary(from, to),
        api.getVaultNewClients(from, to),
        api.getVaultEscalated(from, to),
        api.getVaultChartData(from, to),
      ]);
      setSummary(s);
      setClients(cl);
      setRemesas(rm);
      setBarData(ch.high_risk_by_country.map(r => ({ ...r, key: `${r.country_id}|${r.country_name}` })));
      setLineData(ch.canceled_amount_by_country.map(r => ({ ...r, key: `${r.country_id}|${r.country_name}` })));
    } catch (e: any) {
      setError(e?.message ?? "Error al cargar reporte");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-3">
      {/* Filter bar — same style as RemittancesView / AdministrativoTab */}
      <div className="sticky top-8 z-10 bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Fecha desde</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:border-papaya-orange focus:outline-none bg-white" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Fecha hasta</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:border-papaya-orange focus:outline-none bg-white" />
        </div>
        <div className="flex items-end">
          <button onClick={load} disabled={loading}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-papaya-orange text-white text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Consultar
          </button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
      )}

      {/* Stat cards — 7 cols */}
      <div className="grid grid-cols-3 lg:grid-cols-7 gap-2">
        {[
          { icon: <Users size={14} className="text-purple-500" />,      label: "Nuevos clientes",    value: summary?.new_clients ?? 0,           color: "bg-purple-50 border-purple-100", desc: "Total nuevos Clientes" },
          { icon: <UserX size={14} className="text-rose-500" />,        label: "Alto riesgo",        value: summary?.high_risk_clients ?? 0,     color: "bg-rose-50 border-rose-100",    desc: "Cuentas Canceladas" },
          { icon: <ShieldAlert size={14} className="text-amber-500" />, label: "Escaladas",          value: summary?.escalated ?? 0,             color: "bg-amber-50 border-amber-100",  desc: "Enviadas a revision de cumplimiento" },
          { icon: <Clock size={14} className="text-blue-500" />,        label: "Pendientes",         value: summary?.pending_compliance ?? 0,    color: "bg-blue-50 border-blue-100",    desc: "Pendientes Revision Cumplimiento" },
          { icon: <CheckCircle2 size={14} className="text-green-500" />, label: "Aprobadas",         value: summary?.approved ?? 0,              color: "bg-green-50 border-green-100",  desc: "Devueltas a Operaciones" },
          { icon: <XCircle size={14} className="text-red-500" />,       label: "Canceladas",         value: summary?.rejected ?? 0,              color: "bg-red-50 border-red-100",      desc: "Canceladas" },
          { icon: <XCircle size={14} className="text-orange-500" />,    label: "Cancel. otras áreas", value: summary?.canceled_other_areas ?? 0, color: "bg-orange-50 border-orange-100", desc: "Remesas canceladas por otras areas" },
        ].map(c => (
          <div key={c.label} className={`rounded-xl border px-3 py-2.5 space-y-1.5 ${c.color}`}>
            <div className="flex items-center gap-1.5">{c.icon}<span className="text-[10px] font-semibold text-gray-600 leading-tight">{c.label}</span></div>
            <div className="text-xl font-bold text-gray-900">{c.value}</div>
            <p className="text-[9px] text-gray-400 leading-tight">{c.desc}</p>
          </div>
        ))}
      </div>

      {/* Bottom: table 70% + charts 30% */}
      <div className="flex gap-3 min-h-0" style={{ height: "calc(100vh - 390px)", minHeight: 300 }}>

        {/* Left — tabs + table */}
        <div className="flex flex-col w-[70%] min-w-0 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-gray-100 px-4 pt-2 gap-1 shrink-0">
            {(["clientes", "remesas"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-1.5 text-xs font-medium rounded-t-lg border-b-2 transition-colors capitalize ${
                  tab === t ? "border-papaya-orange text-papaya-orange" : "border-transparent text-gray-500 hover:text-gray-700"
                }`}>
                {t === "clientes" ? "Nuevos Clientes" : "Remesas Escaladas"}
              </button>
            ))}
          </div>

          {/* Table area */}
          <div className="flex-1 overflow-auto">
            {tab === "clientes" ? (
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-gray-50 border-b border-gray-100">
                  <tr>
                    {["#", "Nombre", "Teléfono", "País", "Registrado", "Estado"].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {clients.length === 0 ? (
                    <tr><td colSpan={6} className="px-3 py-8 text-center text-gray-400">Sin clientes en el período</td></tr>
                  ) : clients.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50/60">
                      <td className="px-3 py-1.5">
                        <Link to={`/clientes/${c.id}`} className="text-papaya-orange hover:underline font-mono">#{c.id}</Link>
                      </td>
                      <td className="px-3 py-1.5 font-medium text-gray-800 whitespace-nowrap">{c.name || "—"}</td>
                      <td className="px-3 py-1.5 font-mono text-gray-500 whitespace-nowrap">{c.phone}</td>
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        {(() => { const pc = phoneToCountry(c.phone); return (
                          <span className="inline-flex items-center gap-1">
                            <span>{flag(pc.code)}</span>
                            <span className="text-gray-600">{pc.name}</span>
                          </span>
                        ); })()}
                      </td>
                      <td className="px-3 py-1.5 text-gray-400 whitespace-nowrap">{fmtDateNY(c.created_at)}</td>
                      <td className="px-3 py-1.5">
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${c.active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                          {c.active ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-gray-50 border-b border-gray-100">
                  <tr>
                    {["ID Remesa", "Escalada", "Cliente", "Ruta", "Monto USD", "Estado"].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {remesas.length === 0 ? (
                    <tr><td colSpan={6} className="px-3 py-8 text-center text-gray-400">Sin remesas escaladas en el período</td></tr>
                  ) : remesas.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50/60">
                      <td className="px-3 py-1.5 font-mono whitespace-nowrap">
                        <Link to={`/remesas/${r.id}`} className="text-papaya-orange hover:underline">{r.id}</Link>
                      </td>
                      <td className="px-3 py-1.5 text-gray-400 whitespace-nowrap">{fmtDateNY(r.escalated_at)}</td>
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        <div className="font-medium text-gray-800">{r.client_name || "—"}</div>
                        <div className="text-gray-400 font-mono text-[10px]">{r.client_phone}</div>
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-gray-600">
                          <span>{flag(r.origin_country_id)}</span>
                          <span className="text-[10px]">→</span>
                          <span>{flag(r.destination_country_id ?? null)}</span>
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums font-medium text-gray-800 whitespace-nowrap">
                        {r.sent_amount_usd != null ? fmtUSD(r.sent_amount_usd) : "—"}
                      </td>
                      <td className="px-3 py-1.5">
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${STATUS_COLORS[r.status] ?? "bg-gray-100 text-gray-500"}`}>
                          {STATUS_LABELS[r.status] ?? r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right — charts 30% */}
        <div className="flex flex-col w-[30%] gap-3 min-w-0">

          {/* Chart 1: Horizontal bar — high risk clients by country */}
          <div className="flex-1 bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex flex-col min-h-0">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2 shrink-0">Alto riesgo por país</p>
            {barData.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-[11px] text-gray-300">Sin datos</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={barData}
                  margin={{ top: 2, right: 16, left: 4, bottom: 2 }}
                >
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="country_id"
                    width={120}
                    axisLine={false}
                    tickLine={false}
                    tick={({ x, y, payload }: any) => {
                      const item = barData.find(d => d.country_id === payload.value);
                      const name = item?.country_name ?? payload.value;
                      const label = `${flag(payload.value)} ${name.length > 11 ? name.slice(0, 11) + "…" : name}`;
                      return (
                        <g transform={`translate(${x},${y})`}>
                          <text x={-6} y={0} dy={4} textAnchor="end" fontSize={11} fill="#4b5563">{label}</text>
                        </g>
                      );
                    }}
                  />
                  <Tooltip
                    formatter={(v: any) => [v, "Clientes"]}
                    labelFormatter={(id: string) => {
                      const item = barData.find(d => d.country_id === id);
                      return `${flag(id)} ${item?.country_name ?? id}`;
                    }}
                    contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb" }}
                  />
                  <Bar dataKey="count" fill="#f97316" radius={[0, 3, 3, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Chart 2: Table — canceled amount USD by country */}
          <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-0">
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center gap-2 shrink-0">
              <div className="w-1 h-4 rounded-full bg-orange-500" />
              <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wide">Monto cancelado (USD) por país</span>
            </div>
            {lineData.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-[11px] text-gray-300">Sin datos</div>
            ) : (
              <div className="overflow-auto flex-1">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wide">País</th>
                      <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Monto (USD)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {[...lineData].sort((a, b) => (b.amount_usd ?? 0) - (a.amount_usd ?? 0)).map(d => (
                      <tr key={d.country_id} className="hover:bg-gray-50/60">
                        <td className="px-3 py-1.5">
                          <span className="inline-flex items-center gap-1">
                            <span>{flag(d.country_id)}</span>
                            <span className="text-gray-600">{d.country_name}</span>
                          </span>
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums font-medium text-gray-800">
                          {fmtUSD(d.amount_usd ?? 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
