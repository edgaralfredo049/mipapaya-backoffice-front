import React, { useState, useEffect, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import {
  api, DashboardOps, DashboardPieSlice,
} from "../../api";
import { Search, X, AlertCircle, Loader2, MessageSquare, Mail, StickyNote, ThumbsUp, ThumbsDown, Minus } from "lucide-react";

const ORANGE = "#f97316";
const GREEN  = "#22c55e";
const RED    = "#ef4444";
const BLUE   = "#3b82f6";
const YELLOW = "#eab308";
const GRAY   = "#6b7280";
const TEAL   = "#14b8a6";

const PIE_COLORS_TYPE: Record<string, string>   = { "Notas": ORANGE, "Correos": BLUE, "SMS": TEAL };
const PIE_COLORS_SURVEY: Record<string, string> = { "Bueno": GREEN, "Regular": YELLOW, "Malo": RED };
const PIE_COLORS_STATUS: Record<string, string> = {
  "Pagada": GREEN, "Pendiente": YELLOW, "Transmitida": BLUE,
  "No Pagada": ORANGE, "Cancelada": RED,
};

function todayNY() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}
function monthStartNY() {
  const d = new Date();
  const ny = new Date(d.toLocaleString("en-US", { timeZone: "America/New_York" }));
  return `${ny.getFullYear()}-${String(ny.getMonth() + 1).padStart(2, "0")}-01`;
}

const inp = "rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:border-papaya-orange focus:outline-none bg-white";

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

function StatCard({ label, value, sub, color = "orange", icon }: {
  label: string; value: string | number; sub?: string; color?: string; icon?: React.ReactNode;
}) {
  const ring: Record<string, string> = {
    orange: "border-orange-400", green: "border-green-400",
    yellow: "border-yellow-400", red: "border-red-400", blue: "border-blue-400", teal: "border-teal-400",
  };
  const text: Record<string, string> = {
    orange: "text-orange-600", green: "text-green-600",
    yellow: "text-yellow-600", red: "text-red-500", blue: "text-blue-600", teal: "text-teal-600",
  };
  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 border-l-4 ${ring[color] ?? ring.orange}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">{label}</span>
        {icon && <span className={text[color] ?? text.orange}>{icon}</span>}
      </div>
      <p className={`text-3xl font-bold ${text[color] ?? text.orange}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function MiniDonut({ data, title, colorMap }: { data: DashboardPieSlice[]; title: string; colorMap: Record<string, string> }) {
  return (
    <div className="flex flex-col items-center" style={{ minWidth: 260 }}>
      <p className="text-sm font-semibold text-gray-600 mb-1">{title}</p>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} cx="50%" cy="45%" innerRadius={45} outerRadius={78}
            dataKey="value"
            label={({ value }) => value > 0 ? `${value}%` : ""}
            labelLine={false} fontSize={12}
          >
            {data.map((e, i) => <Cell key={i} fill={colorMap[e.name] ?? GRAY} />)}
          </Pie>
          <Tooltip formatter={(v) => `${v}%`} />
          <Legend iconSize={10} iconType="circle" layout="horizontal" verticalAlign="bottom"
            formatter={(v) => <span className="text-xs text-gray-600">{v}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

const TH = ({ c, right }: { c: React.ReactNode; right?: boolean }) => (
  <th className={`px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap border-b border-gray-200 ${right ? "text-right" : "text-left"}`}>{c}</th>
);
const TD = ({ c, right, cls = "" }: { c: React.ReactNode; right?: boolean; cls?: string }) => (
  <td className={`px-3 py-1.5 text-sm whitespace-nowrap ${right ? "text-right" : "text-left"} ${cls}`}>{c}</td>
);

export const OperacionesTab = () => {
  const [dateFrom, setDateFrom] = useState(monthStartNY());
  const [dateTo,   setDateTo]   = useState(todayNY());
  const [data,     setData]     = useState<DashboardOps | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const load = useCallback(async (from: string, to: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getDashboardOps(from, to);
      setData(res);
    } catch (e: any) {
      setError(e.message ?? "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(dateFrom, dateTo); }, []);

  const kpis = data?.kpis;
  const totalSurvey = kpis?.total_survey || 1;
  const pctBueno    = kpis ? Math.round(kpis.survey_bueno   / totalSurvey * 100) : 0;
  const pctRegular  = kpis ? Math.round(kpis.survey_regular / totalSurvey * 100) : 0;
  const pctMalo     = kpis ? Math.round(kpis.survey_malo    / totalSurvey * 100) : 0;

  return (
    <div className="space-y-3 text-gray-800">

      {/* Filtros */}
      <div className="sticky top-8 z-10 bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Fecha desde</label>
          <input type="date" className={inp} value={dateFrom} max={dateTo || todayNY()} onChange={e => setDateFrom(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Fecha hasta</label>
          <input type="date" className={inp} value={dateTo} min={dateFrom} max={todayNY()} onChange={e => setDateTo(e.target.value)} />
        </div>
        <div className="flex items-end gap-2">
          <button
            onClick={() => load(dateFrom, dateTo)}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-papaya-orange text-white text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            Consultar
          </button>
          <button
            onClick={() => { const f = monthStartNY(); const t = todayNY(); setDateFrom(f); setDateTo(t); load(f, t); }}
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <X size={12} /> Limpiar
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* ── Interacciones Customer Service ──────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total interacciones" value={kpis?.total_interactions ?? "—"} color="orange" icon={<MessageSquare size={18} />} />
        <StatCard label="Notas" value={kpis?.notas ?? "—"} color="blue" icon={<StickyNote size={18} />} />
        <StatCard label="Correos" value={kpis?.emails ?? "—"} color="teal" icon={<Mail size={18} />} />
        <StatCard label="SMS" value={kpis?.sms ?? "—"} color="green" icon={<MessageSquare size={18} />} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        <div className="xl:col-span-2">
          <Block title="Interacciones por día">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data?.interactions_by_day ?? []} margin={{ top: 4, right: 16, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend iconSize={10} iconType="circle" formatter={(v) => <span className="text-xs text-gray-600">{v === "notas" ? "Notas" : v === "emails" ? "Correos" : "SMS"}</span>} />
                <Line type="monotone" dataKey="notas"  stroke={ORANGE} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="emails" stroke={BLUE}   strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="sms"    stroke={TEAL}   strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Block>
        </div>
        <Block title="Distribución por tipo">
          <MiniDonut data={data?.interactions_by_type ?? []} title="" colorMap={PIE_COLORS_TYPE} />
        </Block>
      </div>

      {/* ── Actividad por agente ─────────────────────────────────────────────── */}
      {(data?.interactions_by_agent?.length ?? 0) > 0 && (
        <Block title="Actividad por agente">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <TH c="Agente" />
                  <TH c="Total" right />
                  <TH c="Notas" right />
                  <TH c="Correos" right />
                  <TH c="SMS" right />
                </tr>
              </thead>
              <tbody>
                {data!.interactions_by_agent.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                    <TD c={row.agente} />
                    <TD c={<span className="font-semibold">{row.total}</span>} right />
                    <TD c={row.notas}  right />
                    <TD c={row.emails} right />
                    <TD c={row.sms}    right />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Block>
      )}

      {/* ── Feedback de usuarios ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 pt-1">
        <div className="w-1 h-5 rounded-full bg-orange-500" />
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Feedback de usuarios</h2>
        {kpis && <span className="text-xs text-gray-400">({kpis.total_survey} respuestas en el período)</span>}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Bueno"
          value={kpis?.survey_bueno ?? "—"}
          sub={kpis ? `${pctBueno}% del total` : undefined}
          color="green"
          icon={<ThumbsUp size={18} />}
        />
        <StatCard
          label="Regular"
          value={kpis?.survey_regular ?? "—"}
          sub={kpis ? `${pctRegular}% del total` : undefined}
          color="yellow"
          icon={<Minus size={18} />}
        />
        <StatCard
          label="Malo"
          value={kpis?.survey_malo ?? "—"}
          sub={kpis ? `${pctMalo}% del total` : undefined}
          color="red"
          icon={<ThumbsDown size={18} />}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        <div className="xl:col-span-2">
          <Block title="Tendencia de feedback por día">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data?.survey_by_day ?? []} margin={{ top: 4, right: 16, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend iconSize={10} iconType="circle" formatter={(v) => <span className="text-xs text-gray-600">{v === "bueno" ? "Bueno" : v === "regular" ? "Regular" : "Malo"}</span>} />
                <Line type="monotone" dataKey="bueno"   stroke={GREEN}  strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="regular" stroke={YELLOW} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="malo"    stroke={RED}    strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Block>
        </div>
        <Block title="Distribución de feedback">
          <MiniDonut data={data?.survey_distribution ?? []} title="" colorMap={PIE_COLORS_SURVEY} />
        </Block>
      </div>

      {/* ── Estado de remesas ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        <div className="xl:col-span-1">
          <Block title="Remesas por estado">
            <MiniDonut data={data?.remittances_by_status ?? []} title="" colorMap={PIE_COLORS_STATUS} />
          </Block>
        </div>
        <div className="xl:col-span-2">
          <Block title="Detalle de estados">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <TH c="Estado" />
                    <TH c="% del total" right />
                  </tr>
                </thead>
                <tbody>
                  {(data?.remittances_by_status ?? []).sort((a, b) => b.value - a.value).map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                      <TD c={
                        <span className="flex items-center gap-2">
                          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS_STATUS[row.name] ?? GRAY }} />
                          {row.name}
                        </span>
                      } />
                      <TD c={`${row.value}%`} right cls="font-semibold" />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Block>
        </div>
      </div>

    </div>
  );
};
