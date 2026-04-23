import React, { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, X, ArrowLeftRight, Send, ShieldAlert, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

type AlertDetail = { name: string; triggered: boolean; reason: string };

const _NEG_PHRASES = [
  "no se dispara", "no aplica", "no supera", "no indica", "no se detecta",
  "no se encontr", "no hay ", "sin indicios", "no genera", "no trigger",
  "does not trigger", "not triggered",
];

function _isTriggered(text: string): boolean {
  const lower = text.toLowerCase();
  return !_NEG_PHRASES.some(p => lower.includes(p));
}

// Matches: phone (+573203783976 or (+573203783976)) and remittance IDs (COVEW17176270178)
const _TOKEN_RE = /(\(\+\d{10,15}\)|\+\d{10,15}|[A-Z]{3,6}W\d{8,16})/g;

function ReasonText({ text, onClose }: { text: string; onClose: () => void }) {
  const navigate = useNavigate();

  async function handlePhone(phone: string) {
    onClose();
    try {
      const res = await api.getClients(1, { phone });
      if (res.items.length > 0) {
        navigate(`/clientes/${res.items[0].id}`);
      }
    } catch { /* silent */ }
  }

  function handleRemittance(id: string) {
    onClose();
    navigate(`/remesas/${id}`);
  }

  const parts = text.split(_TOKEN_RE);
  return (
    <>
      {parts.map((part, i) => {
        const clean = part.replace(/^\(|\)$/g, "");
        if (/^\+\d{10,15}$/.test(clean)) {
          return (
            <button
              key={i}
              onClick={() => handlePhone(clean)}
              className="font-mono text-papaya-orange underline hover:text-orange-600 cursor-pointer"
              title="Ver perfil del cliente"
            >
              {part}
            </button>
          );
        }
        if (/^[A-Z]{3,6}W\d{8,16}$/.test(clean)) {
          return (
            <button
              key={i}
              onClick={() => handleRemittance(clean)}
              className="font-mono text-papaya-orange underline hover:text-orange-600 cursor-pointer"
              title="Ver remesa"
            >
              {part}
            </button>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function parseAlertSummary(raw: string | null): AlertDetail[] | null {
  if (!raw) return null;

  // Try structured JSON first
  try {
    const data = JSON.parse(raw);
    if (Array.isArray(data.details) && data.details.length > 0) return data.details;
  } catch {}

  // Parse plain text [Rule Name]: description format
  const pattern = /\[([^\]]+)\]:\s*/g;
  const names: string[] = [];
  const indices: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(raw)) !== null) {
    names.push(m[1]);
    indices.push(m.index + m[0].length);
  }
  if (names.length === 0) return null;

  return names.map((name, i) => {
    const start = indices[i];
    const end   = i + 1 < indices.length ? raw.lastIndexOf("[", indices[i + 1] - 1) : raw.length;
    const reason = raw.slice(start, end).trim().replace(/\.$/, "");
    return { name, triggered: _isTriggered(reason), reason };
  });
}
import { api, RemittanceRecord, Pagador } from "../../api";
import { useAppStore } from "../../store/useAppStore";
import { Pagination } from "../../components/ui/Pagination";

const PAGE_SIZE = 10;

function nyDateToUtcBounds(nyDate: string): { from: string; to: string } {
  const ref = new Date(`${nyDate}T12:00:00Z`);
  const nyHour = parseInt(
    ref.toLocaleString("en-US", { timeZone: "America/New_York", hour: "2-digit", hour12: false })
  );
  const offsetHours = 12 - nyHour;
  const startUtc = new Date(`${nyDate}T00:00:00Z`).getTime() + offsetHours * 3_600_000;
  const endUtc   = startUtc + 24 * 3_600_000 - 1_000;
  const fmt = (ms: number) => new Date(ms).toISOString().slice(0, 19).replace("T", " ");
  return { from: fmt(startUtc), to: fmt(endUtc) };
}

function fmtDateNY(utcStr: string) {
  if (!utcStr) return "—";
  const iso = utcStr.includes("T") ? utcStr : utcStr.replace(" ", "T") + "Z";
  return new Date(iso).toLocaleString("es", {
    timeZone: "America/New_York",
    dateStyle: "short",
    timeStyle: "short",
  });
}

const STATUS_LABELS: Record<string, string> = {
  ureview:    "En revisión",
  pending:    "Pendiente",
  transmited: "Transmitida",
  unpayed:    "No Pagada",
  payed:      "Pagada",
  canceled:   "Cancelada",
};

const STATUS_COLORS: Record<string, string> = {
  ureview:    "bg-purple-50 text-purple-700",
  pending:    "bg-yellow-50 text-yellow-700",
  transmited: "bg-blue-50 text-blue-700",
  unpayed:    "bg-red-50 text-red-600",
  payed:      "bg-green-50 text-green-700",
  canceled:   "bg-gray-100 text-gray-500",
};

function todayNY(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

const sel = "rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:border-papaya-orange focus:outline-none bg-white";
const inp = "rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:border-papaya-orange focus:outline-none bg-white";

export const RemittancesView = () => {
  const { pagadores } = useAppStore();
  const { search: locationSearch } = useLocation();

  const [items, setItems]           = useState<RemittanceRecord[]>([]);
  const [total, setTotal]           = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [sendingId, setSendingId]   = useState<string | null>(null);
  const [confirmId, setConfirmId]   = useState<string | null>(null);
  const [payingId,  setPayingId]    = useState<string | null>(null);
  const [alertModal, setAlertModal] = useState<{ id: string; summary: string } | null>(null);

  const today = todayNY();
  const _qp = new URLSearchParams(locationSearch);
  const [fClient,   setFClient]   = useState(_qp.get("client") ?? "");
  const [fPayer,    setFPayer]    = useState("");
  const [fStatus,   setFStatus]   = useState("");
  const [fDateFrom, setFDateFrom] = useState(_qp.get("client") ? "" : today);
  const [fDateTo,   setFDateTo]   = useState(_qp.get("client") ? "" : today);

  const load = useCallback(async (p: number, filters: {
    client_id?: string; payer_id?: string; status?: string; date_from?: string; date_to?: string;
  }) => {
    setLoading(true);
    setError(null);
    const utcFrom = filters.date_from ? nyDateToUtcBounds(filters.date_from).from : undefined;
    const utcTo   = filters.date_to   ? nyDateToUtcBounds(filters.date_to).to     : undefined;
    try {
      const res = await api.getRemittances({ page: p, ...filters, date_from: utcFrom, date_to: utcTo });
      setItems(res.items);
      setTotal(res.total);
      setTotalPages(Math.max(1, Math.ceil(res.total / PAGE_SIZE)));
    } catch {
      setError("Error al cargar remesas.");
    } finally {
      setLoading(false);
    }
  }, []);

  const getFilters = () => ({
    client_id: fClient   || undefined,
    payer_id:  fPayer    || undefined,
    status:    fStatus   || undefined,
    date_from: fDateFrom || undefined,
    date_to:   fDateTo   || undefined,
  });

  useEffect(() => { load(page, getFilters()); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-poll every 8 s so operator sees ureview → pending transition without manual reload
  useEffect(() => {
    const timer = setInterval(() => load(page, getFilters()), 8000);
    return () => clearInterval(timer);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = () => { setPage(1); load(1, getFilters()); };

  const handleClear = () => {
    setFClient(""); setFPayer(""); setFStatus(""); setFDateFrom(todayNY()); setFDateTo(todayNY());
    setPage(1); load(1, { date_from: nyDateToUtcBounds(todayNY()).from, date_to: nyDateToUtcBounds(todayNY()).to });
  };

  const hasFilters = fClient || fPayer || fStatus || fDateFrom || fDateTo;

  const handleConfirmSend = async () => {
    if (!confirmId) return;
    const id = confirmId;
    setSendingId(id);
    setConfirmId(null);
    try {
      // Step 1: Pendiente → Transmitida
      const transmited = await api.updateRemittanceStatus(id, "transmited");
      setItems(prev => prev.map(r => r.id === transmited.id ? transmited : r));

      setPayingId(id);
      // TODO: replace setTimeout with real integration webhook/callback
      setTimeout(async () => {
        try {
          // Step 2: Transmitida → Pagada (simulated integration response)
          const payed = await api.updateRemittanceStatus(id, "payed");
          setItems(prev => prev.map(r => r.id === payed.id ? payed : r));
        } catch {
          // silent — transmited state remains visible
        } finally {
          setSendingId(null);
          setPayingId(null);
        }
      }, 8000);
    } catch {
      setError("Error al actualizar el estado.");
      setSendingId(null);
    }
  };

  return (
    <div className="space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-heading-text">Remesas</h1>
        <p className="text-sm text-gray-500 mt-0.5">Historial de transacciones procesadas</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Cliente</label>
          <input
            className={inp}
            placeholder="+1…"
            value={fClient}
            onChange={e => setFClient(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Pagador</label>
          <select className={sel} value={fPayer} onChange={e => setFPayer(e.target.value)}>
            <option value="">Todos</option>
            {pagadores.map((p: Pagador) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Estado</label>
          <select className={sel} value={fStatus} onChange={e => setFStatus(e.target.value)}>
            <option value="">Todos</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Fecha desde</label>
          <input type="date" className={inp} value={fDateFrom} onChange={e => setFDateFrom(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Fecha hasta</label>
          <input type="date" className={inp} value={fDateTo} onChange={e => setFDateTo(e.target.value)} />
        </div>
        <div className="flex items-end gap-2">
          <button
            onClick={handleSearch}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-papaya-orange text-white text-sm font-medium hover:bg-orange-600 transition-colors"
          >
            <Search size={14} /> Buscar
          </button>
          {hasFilters && (
            <button
              onClick={handleClear}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <X size={12} /> Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Table toolbar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            {items.some(r => r.status === "ureview") && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-medium animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 inline-block" />
                Validación en curso…
              </span>
            )}
          </div>
          <button
            onClick={() => load(page, getFilters())}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Recargar
          </button>
        </div>
        {error && (
          <div className="px-4 py-3 text-sm text-red-600 bg-red-50 border-b border-red-100">{error}</div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["ID Remesa", "Fecha / Hora (NY)", "Cliente", "Origen → Destino", "Enviado", "Pagador", "Estado", "Alertas", ""].map(h => (
                  <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-gray-400">Cargando…</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-gray-400">
                    {hasFilters ? "Sin resultados para los filtros aplicados." : "No hay remesas registradas."}
                  </td>
                </tr>
              ) : items.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-3 font-mono text-xs whitespace-nowrap">
                    <Link to={`/remesas/${r.id}`} className="text-papaya-orange hover:underline">
                      {r.id}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-gray-500 whitespace-nowrap text-xs">{fmtDateNY(r.created_at)}</td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5">
                      {r.client_db_id ? (
                        <Link to={`/clientes/${r.client_db_id}`} className="font-mono text-papaya-orange hover:underline text-xs">
                          #{r.client_db_id}
                        </Link>
                      ) : <span className="text-gray-400 text-xs">—</span>}
                      {r.client_name && <span className="text-gray-600 text-xs">{r.client_name}</span>}
                    </span>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 text-gray-700 text-xs">
                      <span className="font-medium">{r.origin_country_name || r.origin_country_id || "—"}</span>
                      <ArrowLeftRight size={11} className="text-gray-400" />
                      <span className="font-medium">{r.destination_country_name || r.destination_country_id || "—"}</span>
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums font-medium text-gray-800 text-xs whitespace-nowrap">
                    {(r.sent_amount_local ?? (r.sent_amount_usd ?? 0) * r.collector_rate).toLocaleString("es", {minimumFractionDigits: 2, maximumFractionDigits: 2})} {r.sent_currency}
                  </td>
                  <td className="px-3 py-3 text-gray-700 text-xs">{r.payer_name || r.payer_id || "—"}</td>
                  <td className="px-3 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status] ?? "bg-gray-100 text-gray-500"}`}>
                      {STATUS_LABELS[r.status] ?? r.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    {(r.alert_count ?? 0) > 0 ? (
                      <button
                        onClick={() => setAlertModal({ id: r.id, summary: r.alert_summary ?? "" })}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold hover:bg-red-200 transition-colors"
                        title="Ver alertas de cumplimiento"
                      >
                        <ShieldAlert size={11} /> {r.alert_count}
                      </button>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-3">
                    {r.status === "ureview" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-purple-600 font-medium animate-pulse">
                        <ShieldAlert size={11} /> Validando…
                      </span>
                    ) : payingId === r.id ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-blue-600 font-medium animate-pulse">
                        ⏳ Procesando…
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmId(r.id)}
                        disabled={r.status !== "pending" || sendingId === r.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors bg-papaya-orange text-white hover:bg-orange-500 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Send size={11} /> Enviar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={p => setPage(p)}
          totalItems={total}
          pageSize={PAGE_SIZE}
        />
      </div>

      {/* Alert summary modal */}
      {alertModal && (() => {
        const details = parseAlertSummary(alertModal.summary);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <ShieldAlert size={17} className="text-red-500" />
                  <span className="text-sm font-semibold text-gray-800">Análisis de cumplimiento</span>
                </div>
                <button onClick={() => setAlertModal(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={16} />
                </button>
              </div>

              {/* Remittance ID */}
              <div className="px-5 py-2 bg-gray-50 border-b border-gray-100">
                <span className="text-xs text-gray-500">Remesa </span>
                <span className="text-xs font-mono text-papaya-orange">{alertModal.id}</span>
              </div>

              {/* Alert cards */}
              <div className="px-5 py-4 space-y-3 max-h-96 overflow-y-auto">
                {details ? details.map((d, i) => (
                  <div key={i} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      {d.triggered
                        ? <AlertCircle size={13} className="text-red-500 shrink-0" />
                        : <CheckCircle2 size={13} className="text-green-500 shrink-0" />
                      }
                      <span className="text-xs font-semibold text-gray-800">{d.name}</span>
                      <span className={`ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        d.triggered
                          ? "bg-red-100 text-red-600"
                          : "bg-green-100 text-green-700"
                      }`}>
                        {d.triggered ? "Genera alerta" : "No genera alerta"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed pl-[19px]"><ReasonText text={d.reason} onClose={() => setAlertModal(null)} /></p>
                  </div>
                )) : (
                  <div className="bg-gray-50 rounded-xl border border-gray-200 px-4 py-3 text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
                    {alertModal.summary || "Sin detalle disponible."}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex justify-end px-5 py-3 border-t border-gray-100">
                <button
                  onClick={() => setAlertModal(null)}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Confirm Send dialog */}
      {confirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-80 space-y-4">
            <h3 className="text-sm font-semibold text-heading-text">Confirmar envío</h3>
            <p className="text-sm text-gray-600">
              ¿Desea transmitir la remesa <span className="font-mono text-papaya-orange">{confirmId}</span>?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmId(null)}
                className="px-4 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmSend}
                className="px-4 py-2 rounded-lg bg-papaya-orange text-white text-xs font-medium hover:bg-orange-500 transition-colors"
              >
                Sí, enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
