import React, { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Search, X, ShieldAlert, CheckCircle2, AlertCircle, RefreshCw,
  CreditCard, Send, ArrowUpRight, Undo2, XCircle, Lock, Loader2, Scale,
} from "lucide-react";

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
import { useAuthStore } from "../../store/useAuthStore";
import { Pagination } from "../../components/ui/Pagination";

// ── Step workflow (compact table version) ────────────────────────────────────

type StepState = "active" | "done" | "disabled" | "blocked" | "locked";

interface StepDef { key: string; label: string; icon: React.ReactNode; color: "orange" | "red"; }

const STEPS: StepDef[] = [
  { key: "register_payment", label: "Registrar Pago",    icon: <CreditCard size={11} />, color: "orange" },
  { key: "transmit",         label: "Transmitir",        icon: <Send size={11} />,       color: "orange" },
  { key: "vault",            label: "Escalar/Devolver",  icon: <Scale size={11} />,        color: "orange" },
  { key: "cancel",           label: "Cancelar",          icon: <XCircle size={11} />,    color: "red"    },
];

function getStepState(stepKey: string, record: RemittanceRecord, userRole: string, canWrite: boolean): StepState {
  const s = record.status;
  if (s === "payed" || s === "canceled") return "locked";
  const isBlocking = s === "ureview" || s === "transmited";

  if (stepKey === "register_payment") {
    if (isBlocking) return "blocked";
    if (s === "pending_payment" && canWrite && (userRole === "operaciones" || userRole === "superusuario")) return "active";
    if (s !== "pending_payment") return "done";
    return "disabled";
  }
  if (stepKey === "transmit") {
    if (s === "pending_payment") return "disabled";
    if (s === "ureview") return "blocked";
    if (s === "transmited") return "done";
    if ((s === "pending" || s === "unpayed") && canWrite && (userRole === "operaciones" || userRole === "superusuario") && record.vault === "operations") return "active";
    return "disabled";
  }
  if (stepKey === "vault") {
    if (s === "pending_payment") return "disabled";
    if (isBlocking) return "blocked";
    if (s !== "pending") return "disabled";
    const canEscalar  = record.vault === "operations" && (userRole === "operaciones" || userRole === "superusuario");
    const canRetornar = record.vault === "compliance"  && (userRole === "cumplimiento"  || userRole === "superusuario");
    if ((canEscalar || canRetornar) && canWrite) return "active";
    return "disabled";
  }
  if (stepKey === "cancel") {
    if (s === "pending_payment") return "disabled";
    if (isBlocking) return "blocked";
    if ((s === "pending" || s === "unpayed") && canWrite && (userRole === "operaciones" || userRole === "cumplimiento" || userRole === "superusuario")) return "active";
    return "disabled";
  }
  return "disabled";
}

function MiniCircle({ icon, state, color, label, onClick }: {
  icon: React.ReactNode; state: StepState; color: "orange" | "red"; label: string; onClick?: () => void;
}) {
  const base = "w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all";
  const isClickable = state === "active" && !!onClick;

  const colorClass =
    state === "locked"  ? "bg-gray-100 text-gray-300 ring-1 ring-gray-200" :
    state === "done"    ? "bg-green-500 text-white" :
    state === "blocked" ? "bg-gray-100 text-gray-400 ring-1 ring-gray-200" :
    state === "active"  ? (color === "red" ? "bg-red-500 text-white ring-2 ring-red-200" : "bg-papaya-orange text-white ring-2 ring-papaya-orange/30") :
                          "bg-gray-50 text-gray-300 ring-1 ring-gray-100";

  return (
    <div
      className={`relative group ${isClickable ? "cursor-pointer hover:scale-110" : "cursor-default"} transition-transform`}
      onClick={isClickable ? onClick : undefined}
    >
      <div className={`${base} ${colorClass}`}>
        {state === "locked"  ? <Lock size={9} />                             :
         state === "done"    ? <CheckCircle2 size={10} />                    :
         state === "blocked" ? <Loader2 size={9} className="animate-spin" /> :
         icon}
      </div>
      <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded-md bg-gray-900 text-white text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
        {label}
      </div>
    </div>
  );
}

function MiniConnector({ active }: { active: boolean }) {
  return <div className="w-3 h-px shrink-0" style={{ background: active ? "#f97316" : "#e5e7eb" }} />;
}

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
  pending_payment: "Pago Pendiente",
  ureview:    "En revisión",
  pending:    "Pendiente",
  transmited: "Transmitida",
  unpayed:    "No Pagada",
  payed:      "Pagada",
  canceled:   "Cancelada",
};

const STATUS_COLORS: Record<string, string> = {
  pending_payment: "bg-orange-50 text-orange-600",
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

function thirtyDaysAgoNY(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

const sel = "rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:border-papaya-orange focus:outline-none bg-white";
const inp = "rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:border-papaya-orange focus:outline-none bg-white";

export const RemittancesView = () => {
  const { pagadores } = useAppStore();
  const { search: locationSearch } = useLocation();
  const userRole = useAuthStore(s => s.user?.role ?? "");
  const canWrite = useAuthStore(s => s.hasPermission("remesas", true));

  const [items, setItems]           = useState<RemittanceRecord[]>([]);
  const [total, setTotal]           = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [alertModal, setAlertModal] = useState<{ id: string; summary: string } | null>(null);

  // Action state (shared across rows)
  const [activeRecord, setActiveRecord]               = useState<RemittanceRecord | null>(null);
  const [showRegisterPayment, setShowRegisterPayment] = useState(false);
  const [paymentRef, setPaymentRef]                   = useState("");
  const [registeringPayment, setRegisteringPayment]   = useState(false);
  const [registerPaymentError, setRegisterPaymentError] = useState<string | null>(null);
  const [confirmTransmit, setConfirmTransmit]         = useState(false);
  const [transmitting, setTransmitting]               = useState(false);
  const [transmitError, setTransmitError]             = useState<string | null>(null);
  const [confirmVault, setConfirmVault]               = useState<{ toVault: "operations" | "compliance"; label: string } | null>(null);
  const [vaulting, setVaulting]                       = useState(false);
  const [vaultError, setVaultError]                   = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel]             = useState(false);
  const [canceling, setCanceling]                     = useState(false);
  const [cancelError, setCancelError]                 = useState<string | null>(null);

  const _qp = new URLSearchParams(locationSearch);
  const hasClientFilter = !!_qp.get("client");
  const [fClient,   setFClient]   = useState(_qp.get("client") ?? "");
  const [fPayer,    setFPayer]    = useState("");
  const [fStatus,   setFStatus]   = useState("");
  const [fDateFrom, setFDateFrom] = useState("");
  const [fDateTo,   setFDateTo]   = useState("");

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


  const updateRow = (updated: RemittanceRecord) =>
    setItems(prev => prev.map(it => it.id === updated.id ? updated : it));

  const openStep = (record: RemittanceRecord, stepKey: string) => {
    setActiveRecord(record);
    setRegisterPaymentError(null); setTransmitError(null); setVaultError(null); setCancelError(null);
    if (stepKey === "register_payment") { setPaymentRef(""); setShowRegisterPayment(true); }
    if (stepKey === "transmit") setConfirmTransmit(true);
    if (stepKey === "vault") setConfirmVault({
      toVault: record.vault === "operations" ? "compliance" : "operations",
      label:   record.vault === "operations" ? "Escalar a Cumplimiento" : "Devolver a Operaciones",
    });
    if (stepKey === "cancel") setConfirmCancel(true);
  };

  const handleRegisterPayment = async () => {
    if (!activeRecord) return;
    setRegisteringPayment(true); setRegisterPaymentError(null); setShowRegisterPayment(false);
    try {
      const updated = await api.registerRemittancePayment(activeRecord.id, paymentRef || undefined);
      updateRow(updated); setPaymentRef("");
    } catch (e: any) { setRegisterPaymentError(e?.message || "Error al registrar el pago."); } finally { setRegisteringPayment(false); }
  };

  const handleTransmit = async () => {
    if (!activeRecord) return;
    setTransmitting(true); setTransmitError(null); setConfirmTransmit(false);
    try {
      const updated = await api.updateRemittanceStatus(activeRecord.id, "transmited");
      updateRow(updated);
    } catch (e: any) {
      const detail: string = e?.message || "Error al transmitir.";
      if (detail.includes("KYC_DECLINED")) {
        setTransmitError("⚠️ KYC rechazado — Este cliente tiene verificación de identidad rechazada. Actualiza el estado del cliente antes de transmitir.");
      } else {
        setTransmitError(detail);
      }
    } finally { setTransmitting(false); }
  };

  const handleVaultChange = async () => {
    if (!activeRecord || !confirmVault) return;
    setVaulting(true); setVaultError(null);
    const { toVault } = confirmVault;
    setConfirmVault(null);
    try {
      const updated = await api.updateRemittanceVault(activeRecord.id, toVault);
      updateRow(updated);
    } catch (e: any) { setVaultError(e?.message || "Error al mover la bóveda."); } finally { setVaulting(false); }
  };

  const handleCancelRemittance = async () => {
    if (!activeRecord) return;
    setCanceling(true); setCancelError(null); setConfirmCancel(false);
    try {
      const updated = await api.updateRemittanceStatus(activeRecord.id, "canceled");
      updateRow(updated);
    } catch { setCancelError("Error al cancelar la remesa."); } finally { setCanceling(false); }
  };

  const handleSearch = () => { setPage(1); load(1, getFilters()); };

  const handleClear = () => {
    const from = thirtyDaysAgoNY();
    const to   = todayNY();
    setFClient(""); setFPayer(""); setFStatus("pending"); setFDateFrom(from); setFDateTo(to);
    setPage(1); load(1, { status: "pending", date_from: nyDateToUtcBounds(from).from, date_to: nyDateToUtcBounds(to).to });
  };

  const hasFilters = fClient || fPayer || fStatus || fDateFrom || fDateTo;

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
          <div />
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
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["ID Remesa", "Fecha (NY)", "Cliente", "Enviado", "Pagador", "Recolector", "Estado", "Alertas", "Flujo"].map(h => (
                  <th key={h} className="px-2 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-sm text-gray-400">Cargando…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-sm text-gray-400">{hasFilters ? "Sin resultados para los filtros aplicados." : "No hay remesas registradas."}</td></tr>
              ) : items.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-2 py-1.5 font-mono whitespace-nowrap">
                    <Link to={`/remesas/${r.id}`} className="text-papaya-orange hover:underline">{r.id}</Link>
                  </td>
                  <td className="px-2 py-1.5 text-gray-500 whitespace-nowrap">{fmtDateNY(r.created_at)}</td>
                  <td className="px-2 py-1.5 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      {r.client_db_id ? <Link to={`/clientes/${r.client_db_id}`} className="font-mono text-papaya-orange hover:underline">#{r.client_db_id}</Link> : <span className="text-gray-400">—</span>}
                      {r.client_name && <span className="text-gray-600">{r.client_name}</span>}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums font-medium text-gray-800 whitespace-nowrap">
                    {(r.sent_amount_local ?? (r.sent_amount_usd ?? 0) * r.collector_rate).toLocaleString("es", {minimumFractionDigits: 2, maximumFractionDigits: 2})} {r.sent_currency}
                  </td>
                  <td className="px-2 py-1.5 text-gray-700 whitespace-nowrap">{r.payer_name || r.payer_id || "—"}</td>
                  <td className="px-2 py-1.5 text-gray-700 whitespace-nowrap">{r.collector_name || "—"}</td>
                  <td className="px-2 py-1.5">
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${STATUS_COLORS[r.status] ?? "bg-gray-100 text-gray-500"}`}>
                      {STATUS_LABELS[r.status] ?? r.status}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    {(r.alert_count ?? 0) > 0 ? (
                      <button onClick={() => setAlertModal({ id: r.id, summary: r.alert_summary ?? "" })}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-semibold hover:bg-red-200 transition-colors"
                        title="Ver alertas de cumplimiento">
                        <ShieldAlert size={10} /> {r.alert_count}
                      </button>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-2 py-1.5">
                    {r.status === "ureview" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-medium animate-pulse whitespace-nowrap">
                        <Loader2 size={9} className="animate-spin" /> En validación…
                      </span>
                    ) : r.status === "transmited" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-medium animate-pulse whitespace-nowrap">
                        <Loader2 size={9} className="animate-spin" /> Transmitiendo…
                      </span>
                    ) : (
                      <div className="flex items-center gap-0.5">
                        {STEPS.map((step, i) => {
                          const state = getStepState(step.key, r, userRole, canWrite);
                          const nextState = i < STEPS.length - 1 ? getStepState(STEPS[i + 1].key, r, userRole, canWrite) : null;
                          const connActive = state === "done" || nextState === "active";
                          return (
                            <React.Fragment key={step.key}>
                              <MiniCircle
                                icon={step.icon}
                                state={state}
                                color={step.color}
                                label={step.label}
                                onClick={state === "active" ? () => openStep(r, step.key) : undefined}
                              />
                              {i < STEPS.length - 1 && <MiniConnector active={connActive} />}
                            </React.Fragment>
                          );
                        })}
                      </div>
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

      {/* ── Action modals ── */}

      {/* Register payment */}
      {showRegisterPayment && activeRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-96 space-y-4">
            <div className="flex items-center gap-2">
              <CreditCard size={18} className="text-papaya-orange" />
              <h3 className="text-sm font-semibold text-heading-text">Registrar pago manual</h3>
            </div>
            <p className="text-sm text-body-text">
              Ingresa el ID de referencia del pago para la remesa{" "}
              <span className="font-mono text-papaya-orange">{activeRecord.id}</span>.
            </p>
            <div className="space-y-1.5">
              <label className="text-xs text-gray-500">ID de referencia (opcional)</label>
              <input
                type="text"
                value={paymentRef}
                onChange={e => setPaymentRef(e.target.value)}
                placeholder="Ej. TXN-123456"
                className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 focus:border-papaya-orange focus:outline-none"
              />
            </div>
            {registerPaymentError && <p className="text-xs text-red-500">{registerPaymentError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowRegisterPayment(false)} className="px-4 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancelar</button>
              <button onClick={handleRegisterPayment} disabled={registeringPayment} className="px-4 py-2 rounded-lg bg-papaya-orange text-white text-xs font-medium hover:bg-orange-500 transition-colors disabled:opacity-40">
                {registeringPayment ? "…" : "Confirmar pago"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transmit confirm */}
      {confirmTransmit && activeRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-80 space-y-4">
            <div className="flex items-center gap-2"><Send size={18} className="text-papaya-orange" /><h3 className="text-sm font-semibold text-heading-text">Transmitir remesa</h3></div>
            <p className="text-sm text-body-text">¿Transmitir la remesa <span className="font-mono text-papaya-orange">{activeRecord.id}</span> al pagador?</p>
            {transmitError && <p className="text-xs text-red-500">{transmitError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setConfirmTransmit(false)} className="px-4 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancelar</button>
              <button onClick={handleTransmit} disabled={transmitting} className="px-4 py-2 rounded-lg bg-papaya-orange text-white text-xs font-medium hover:bg-orange-500 transition-colors disabled:opacity-40">
                {transmitting ? "…" : "Sí, transmitir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vault confirm */}
      {confirmVault && activeRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-80 space-y-4">
            <div className="flex items-center gap-2">
              {confirmVault.toVault === "compliance" ? <ArrowUpRight size={18} className="text-papaya-orange" /> : <Undo2 size={18} className="text-papaya-orange" />}
              <h3 className="text-sm font-semibold text-heading-text">{confirmVault.label}</h3>
            </div>
            <p className="text-sm text-body-text">
              ¿Mover la remesa <span className="font-mono text-papaya-orange">{activeRecord.id}</span> a{" "}
              <span className="font-semibold">{confirmVault.toVault === "compliance" ? "Cumplimiento" : "Operaciones"}</span>?
            </p>
            {vaultError && <p className="text-xs text-red-500">{vaultError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setConfirmVault(null)} className="px-4 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancelar</button>
              <button onClick={handleVaultChange} disabled={vaulting} className="px-4 py-2 rounded-lg bg-papaya-orange text-white text-xs font-medium hover:bg-orange-500 transition-colors disabled:opacity-40">
                {vaulting ? "…" : "Sí, mover"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel confirm */}
      {confirmCancel && activeRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-96 space-y-4">
            <div className="flex items-center gap-2"><XCircle size={18} className="text-red-500" /><h3 className="text-sm font-semibold text-heading-text">Cancelar remesa</h3></div>
            <p className="text-sm text-body-text">
              ¿Cancelar la remesa <span className="font-mono text-papaya-orange">{activeRecord.id}</span>?
              Esta acción no se puede deshacer.
            </p>
            {cancelError && <p className="text-xs text-red-500">{cancelError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setConfirmCancel(false)} className="px-4 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">Volver</button>
              <button onClick={handleCancelRemittance} disabled={canceling} className="px-4 py-2 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-600 transition-colors disabled:opacity-40">
                {canceling ? "…" : "Sí, cancelar"}
              </button>
            </div>
          </div>
        </div>
      )}

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

    </div>
  );
};
