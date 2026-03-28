import React, { useState, useEffect, useCallback } from "react";
import { Search, X, ArrowLeftRight, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { api, RemittanceRecord, Pagador } from "../../api";
import { useAppStore } from "../../store/useAppStore";
import { Pagination } from "../../components/ui/Pagination";

const PAGE_SIZE = 10;

// Returns today's date in America/New_York as "YYYY-MM-DD"
function todayNY(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

// Converts a NY calendar date ("YYYY-MM-DD") to UTC datetime bounds
// so the backend (which stores UTC) can filter the full NY day correctly.
function nyDateToUtcBounds(nyDate: string): { from: string; to: string } {
  // Sample noon UTC on that day to detect the current NY offset (handles DST)
  const ref = new Date(`${nyDate}T12:00:00Z`);
  const nyHour = parseInt(
    ref.toLocaleString("en-US", { timeZone: "America/New_York", hour: "2-digit", hour12: false })
  );
  const offsetHours = 12 - nyHour; // e.g. 4 for EDT, 5 for EST
  const startUtc = new Date(`${nyDate}T00:00:00Z`).getTime() + offsetHours * 3_600_000;
  const endUtc   = startUtc + 24 * 3_600_000 - 1_000; // 23:59:59 NY in UTC
  const fmt = (ms: number) => new Date(ms).toISOString().slice(0, 19).replace("T", " ");
  return { from: fmt(startUtc), to: fmt(endUtc) };
}

function fmtDateNY(utcStr: string) {
  if (!utcStr) return "—";
  // SQLite datetime('now') returns "YYYY-MM-DD HH:MM:SS" without timezone marker.
  // Normalise to ISO 8601 UTC so Date() always parses it as UTC.
  const iso = utcStr.includes("T") ? utcStr : utcStr.replace(" ", "T") + "Z";
  return new Date(iso).toLocaleString("es", {
    timeZone: "America/New_York",
    dateStyle: "short",
    timeStyle: "short",
  });
}

const STATUS_LABELS: Record<string, string> = {
  pending:   "Pendiente",
  transmited: "Transmitida",
  unpayed:   "No Pagada",
  payed:     "Pagada",
  canceled:  "Cancelada",
};

const STATUS_COLORS: Record<string, string> = {
  pending:   "bg-yellow-50 text-yellow-700",
  transmited: "bg-blue-50 text-blue-700",
  unpayed:   "bg-red-50 text-red-600",
  payed:     "bg-green-50 text-green-700",
  canceled:  "bg-gray-100 text-gray-500",
};

const inputCls =
  "h-8 rounded-lg border border-gray-200 px-3 text-xs text-gray-700 placeholder-gray-400 focus:border-papaya-orange focus:outline-none bg-white";

export const RemittancesView = () => {
  const { pagadores } = useAppStore();

  const [items, setItems]           = useState<RemittanceRecord[]>([]);
  const [total, setTotal]           = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [sendingId, setSendingId]   = useState<string | null>(null);
  const [confirmId, setConfirmId]   = useState<string | null>(null);

  const today = todayNY();

  const [fClient,   setFClient]   = useState("");
  const [fPayer,    setFPayer]    = useState("");
  const [fDateFrom, setFDateFrom] = useState(today);
  const [fDateTo,   setFDateTo]   = useState(today);

  const fetch = useCallback(async (p: number, filters: {
    client_id?: string; payer_id?: string; date_from?: string; date_to?: string;
  }) => {
    setLoading(true);
    setError(null);
    // Convert NY calendar dates to UTC datetime bounds before sending to backend
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

  useEffect(() => {
    fetch(page, { client_id: fClient || undefined, payer_id: fPayer || undefined, date_from: fDateFrom || undefined, date_to: fDateTo || undefined });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleSearch = () => {
    setPage(1);
    fetch(1, { client_id: fClient || undefined, payer_id: fPayer || undefined, date_from: fDateFrom || undefined, date_to: fDateTo || undefined });
  };

  const handleClear = () => {
    setFClient(""); setFPayer(""); setFDateFrom(todayNY()); setFDateTo(todayNY());
    setPage(1);
    fetch(1, {});
  };

  const hasFilters = fClient || fPayer || fDateFrom || fDateTo;

  const handleConfirmSend = async () => {
    if (!confirmId) return;
    setSendingId(confirmId);
    setConfirmId(null);
    try {
      const updated = await api.updateRemittanceStatus(confirmId, "transmited");
      setItems(prev => prev.map(r => r.id === updated.id ? updated : r));
    } catch {
      setError("Error al actualizar el estado.");
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-heading-text">Remesas</h1>
        <p className="text-sm text-body-text mt-0.5">Historial de transacciones procesadas</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Cliente (teléfono)</label>
            <input
              className={inputCls}
              placeholder="+1…"
              value={fClient}
              onChange={e => setFClient(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Pagador</label>
            <select
              className={inputCls}
              value={fPayer}
              onChange={e => setFPayer(e.target.value)}
            >
              <option value="">Todos</option>
              {pagadores.map((p: Pagador) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Fecha desde</label>
            <input
              type="date"
              className={inputCls}
              value={fDateFrom}
              onChange={e => setFDateFrom(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Fecha hasta</label>
            <input
              type="date"
              className={inputCls}
              value={fDateTo}
              onChange={e => setFDateTo(e.target.value)}
            />
          </div>
          <div className="flex gap-2 lg:col-span-2">
            <button
              onClick={handleSearch}
              className="flex-1 h-8 flex items-center justify-center gap-1.5 rounded-lg bg-papaya-orange text-white text-xs font-medium hover:bg-orange-500 transition-colors"
            >
              <Search size={13} /> Buscar
            </button>
            {hasFilters && (
              <button
                onClick={handleClear}
                className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {error && (
          <div className="px-4 py-3 text-sm text-red-icon bg-red-light border-b border-red-200">{error}</div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["ID Remesa", "Fecha / Hora (NY)", "Cliente", "Origen → Destino", "Monto USD", "Pagador", "Estado"].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">{h}</th>
                ))}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-400">Cargando…</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                    {hasFilters ? "Sin resultados para los filtros aplicados." : "No hay remesas registradas."}
                  </td>
                </tr>
              ) : (
                items.map(r => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                      <Link to={`/remesas/${r.id}`} className="text-papaya-orange hover:underline">
                        {r.id}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDateNY(r.created_at)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        {r.client_db_id ? (
                          <Link to={`/clientes/${r.client_db_id}`} className="font-mono text-papaya-orange hover:underline text-xs">
                            #{r.client_db_id}
                          </Link>
                        ) : <span className="text-gray-400">—</span>}
                        {r.client_name && <span className="text-gray-500 text-xs">{r.client_name}</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-gray-700">
                        <span className="font-medium">{r.origin_country_name || r.origin_country_id || "—"}</span>
                        <ArrowLeftRight size={11} className="text-gray-400" />
                        <span className="font-medium">{r.destination_country_name || r.destination_country_id || "—"}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-gray-800">
                      ${r.sent_amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{r.payer_name || r.payer_id || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status] ?? "bg-gray-100 text-gray-500"}`}>
                        {STATUS_LABELS[r.status] ?? r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setConfirmId(r.id)}
                        disabled={r.status !== "pending" || sendingId === r.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors bg-papaya-orange text-white hover:bg-orange-500 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Enviar remesa"
                      >
                        <Send size={11} /> Send
                      </button>
                    </td>
                  </tr>
                ))
              )}
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
      {/* Confirm Send dialog */}
      {confirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-80 space-y-4">
            <h3 className="text-sm font-semibold text-heading-text">Confirmar envío</h3>
            <p className="text-sm text-body-text">
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
