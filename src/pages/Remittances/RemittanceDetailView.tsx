import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { ArrowLeft, ArrowLeftRight, User, Package, FileText, MessageSquare, X, CheckCircle2 } from "lucide-react";
import { api, RemittanceRecord, RemittanceAuditEntry, Pagador, ChatLogMessage } from "../../api";
import { useAppStore } from "../../store/useAppStore";

const STATUS_LABELS: Record<string, string> = {
  pending:    "Pendiente",
  transmited: "Transmitida",
  unpayed:    "No Pagada",
  payed:      "Pagada",
  canceled:   "Cancelada",
};

const STATUS_COLORS: Record<string, string> = {
  pending:    "bg-yellow-50 text-yellow-700",
  transmited: "bg-blue-50 text-blue-700",
  unpayed:    "bg-red-50 text-red-600",
  payed:      "bg-green-50 text-green-700",
  canceled:   "bg-gray-100 text-gray-500",
};

function fmtDateNY(utcStr: string | null) {
  if (!utcStr) return "—";
  const iso = utcStr.includes("T") ? utcStr : utcStr.replace(" ", "T") + "Z";
  return new Date(iso).toLocaleString("es", {
    timeZone: "America/New_York",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm text-gray-800 font-medium">{value || "—"}</p>
    </div>
  );
}

function SectionCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-50">
        <span className="text-papaya-orange">{icon}</span>
        <h2 className="text-sm font-semibold text-heading-text">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function parseJson(raw: string | null | undefined): Record<string, string> {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

const ACTION_LABELS: Record<string, string> = {
  status_change: "Cambio de estado",
  payer_change:  "Cambio de pagador",
};

const FIELD_LABELS: Record<string, string> = {
  status: "Estado",
  payer:  "Pagador",
};

const DISBURSEMENT_LABELS: Record<string, string> = {
  cash_pickup:    "Efectivo (recogida)",
  mobile_wallet:  "Billetera móvil",
  bank_deposit:   "Depósito bancario",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash:           "Efectivo",
  bank_transfer:  "Transferencia bancaria",
  zelle:          "Zelle",
  card:           "Tarjeta",
};

export const RemittanceDetailView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const fromSoporte = (location.state as any)?.from === "soporte";
  const handleBack = () => fromSoporte ? navigate("/soporte") : window.history.length > 1 ? navigate(-1) : navigate("/remesas");
  const { pagadores } = useAppStore();

  const [record, setRecord]           = useState<RemittanceRecord | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [auditLog, setAuditLog]       = useState<RemittanceAuditEntry[]>([]);

  // Payer change
  const [newPayerId, setNewPayerId]     = useState("");
  const [confirmPayer, setConfirmPayer] = useState(false);
  const [savingPayer, setSavingPayer]   = useState(false);
  const [payerError, setPayerError]     = useState<string | null>(null);

  // Status change
  const [newStatus, setNewStatus]         = useState("");
  const [confirmStatus, setConfirmStatus] = useState(false);
  const [savingStatus, setSavingStatus]   = useState(false);
  const [statusError, setStatusError]     = useState<string | null>(null);

  const [showChat, setShowChat]       = useState(false);
  const [chatLog, setChatLog]         = useState<ChatLogMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showChat) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [showChat]);

  async function openChatLog() {
    if (!id) return;
    setShowChat(true);
    if (chatLog.length > 0) {
      setTimeout(() => { chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight }); }, 50);
      return;
    }
    setChatLoading(true);
    try {
      const res = await api.getRemittanceChatLog(id);
      setChatLog(res.messages);
      setTimeout(() => { chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight }); }, 50);
    } catch { /* silent */ } finally {
      setChatLoading(false);
    }
  }

  const refreshAuditLog = useCallback(async (remittanceId: string) => {
    try {
      const log = await api.getRemittanceAuditLog(remittanceId);
      setAuditLog(log);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    if (!id) return;
    api.getRemittance(id)
      .then(r => { setRecord(r); setNewPayerId(r.payer_id ?? ""); setNewStatus(r.status ?? ""); return r.id; })
      .then(rid => refreshAuditLog(rid))
      .catch(() => setError("No se pudo cargar la remesa."))
      .finally(() => setLoading(false));
  }, [id]);

  const handleConfirmPayerChange = async () => {
    if (!record || !newPayerId) return;
    setSavingPayer(true);
    setPayerError(null);
    setConfirmPayer(false);
    try {
      const updated = await api.updateRemittancePayer(record.id, newPayerId);
      setRecord(updated);
      setNewPayerId(updated.payer_id ?? "");
      await refreshAuditLog(record.id);
    } catch {
      setPayerError("Error al actualizar el pagador.");
    } finally {
      setSavingPayer(false);
    }
  };

  const handleConfirmStatusChange = async () => {
    if (!record || !newStatus) return;
    setSavingStatus(true);
    setStatusError(null);
    setConfirmStatus(false);
    try {
      const updated = await api.updateRemittanceStatus(record.id, newStatus);
      setRecord(updated);
      setNewStatus(updated.status ?? "");
      await refreshAuditLog(record.id);
    } catch {
      setStatusError("Error al actualizar el estado.");
    } finally {
      setSavingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="text-sm text-gray-400 animate-pulse">Cargando…</div>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-4">
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 px-3.5 py-2 rounded-lg shadow-sm transition-all"
        >
          <ArrowLeft size={14} /> Volver
        </button>
        <div className="text-sm text-red-500">{error || "Remesa no encontrada."}</div>
      </div>
    );
  }

  const beneficiary   = parseJson(record.beneficiary);
  const paymentDetails = parseJson(record.payment_details);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Back */}
      <button
        onClick={handleBack}
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 px-3.5 py-2 rounded-lg shadow-sm transition-all"
      >
        <ArrowLeft size={14} /> Volver
      </button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-papaya-orange/10 flex items-center justify-center shrink-0">
            <ArrowLeftRight size={22} className="text-papaya-orange" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-heading-text font-mono">{record.id}</h1>
            <p className="text-sm text-body-text mt-0.5">
              {fmtDateNY(record.created_at)} · {record.origin_country_name || record.origin_country_id || "—"} → {record.destination_country_name || record.destination_country_id || "—"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openChatLog}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-papaya-orange text-white hover:bg-papaya-orange/90 transition-colors"
          >
            <img src="/favicon.jpeg" alt="Chat" className="w-4 h-4 rounded-full object-cover" />
            Ver chat
          </button>
          <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${STATUS_COLORS[record.status] ?? "bg-gray-100 text-gray-500"}`}>
            {STATUS_LABELS[record.status] ?? record.status}
          </span>
        </div>
      </div>

      {/* Monetary summary bar */}
      <div className="bg-papaya-orange/5 border border-papaya-orange/20 rounded-xl px-6 py-4 grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">Enviado</p>
          <p className="text-2xl font-bold text-heading-text tabular-nums">
            ${record.sent_amount.toFixed(2)}
            <span className="text-sm font-normal text-gray-400 ml-1">{record.sent_currency}</span>
          </p>
        </div>
        <div className="text-center border-x border-papaya-orange/20">
          <p className="text-xs text-gray-500 mb-1">Comisión</p>
          <p className="text-2xl font-bold text-heading-text tabular-nums">
            {record.fee_amount > 0 ? `$${record.fee_amount.toFixed(2)}` : "—"}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">A pagar</p>
          <p className="text-2xl font-bold text-papaya-orange tabular-nums">
            {record.amount_to_pay.toFixed(2)}
            <span className="text-sm font-normal text-gray-400 ml-1">{record.pay_currency}</span>
          </p>
        </div>
      </div>

      {/* Card 1: Client */}
      <SectionCard icon={<User size={16} />} title="Cliente">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
          <Field
            label="ID"
            value={
              record.client_db_id ? (
                <Link
                  to={`/clientes/${record.client_db_id}`}
                  className="text-papaya-orange hover:underline font-mono"
                >
                  #{record.client_db_id}
                </Link>
              ) : "—"
            }
          />
          <Field label="Nombre"    value={record.client_name} />
          <Field label="Teléfono"  value={record.client_phone || record.client_id} />
          <Field label="Correo"    value={record.client_email} />
          <Field label="Ciudad"    value={record.client_city} />
          <Field label="Estado"    value={record.client_state} />
          {record.client_address && (
            <div className="lg:col-span-3">
              <Field label="Dirección" value={record.client_address} />
            </div>
          )}
        </div>
      </SectionCard>

      {/* Card 2: Beneficiary + payment + delivery */}
      <SectionCard icon={<Package size={16} />} title="Beneficiario · Pago · Entrega">
        <div className="space-y-5">
          {/* Beneficiary */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Beneficiario</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
              <Field label="Nombre"      value={beneficiary.name} />
              <Field label="ID / Cédula" value={beneficiary.id || record.beneficiary_doc_id} />
              <Field label="Teléfono"    value={beneficiary.phone} />
              <Field label="Ciudad"      value={beneficiary.city} />
              {beneficiary.address && (
                <div className="lg:col-span-4">
                  <Field label="Dirección" value={beneficiary.address} />
                </div>
              )}
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Payment & delivery */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Método de pago y entrega</p>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
              <Field
                label="Método de envío"
                value={PAYMENT_METHOD_LABELS[record.sender_payment_method ?? ""] || record.sender_payment_method}
              />
              <Field
                label="Método de entrega"
                value={DISBURSEMENT_LABELS[record.disbursement_method ?? ""] || record.disbursement_method}
              />
              <Field label="Pagador" value={record.payer_name || record.payer_id} />
              {Object.entries(paymentDetails).map(([k, v]) => (
                <Field key={k} label={k} value={String(v)} />
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Estado update section */}
      {(() => {
        const locked = record.status === "payed" || record.status === "transmited";
        return (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
              <h2 className="text-sm font-semibold text-heading-text">Actualización de estados</h2>
              {locked && (
                <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                  <CheckCircle2 size={12} className={record.status === "payed" ? "text-green-500" : "text-blue-500"} />
                  {record.status === "payed" ? "Pagada — bloqueado" : "Transmitida — bloqueado"}
                </span>
              )}
            </div>
            <div className="p-6">
              {locked ? (
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50 border border-gray-100 text-sm text-gray-500">
                  <CheckCircle2 size={15} className={record.status === "payed" ? "text-green-500 shrink-0" : "text-blue-500 shrink-0"} />
                  La remesa está en estado <span className="font-semibold mx-1">{STATUS_LABELS[record.status]}</span> y no puede modificarse.
                </div>
              ) : (
                <div className="flex flex-wrap gap-6">
                  {/* Estado selector */}
                  <div className="flex flex-col gap-1.5 flex-1 min-w-[180px]">
                    <label className="text-xs text-gray-400">Estado</label>
                    <div className="flex gap-2 items-center">
                      <select
                        value={newStatus}
                        onChange={e => setNewStatus(e.target.value)}
                        className="h-9 flex-1 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 focus:border-papaya-orange focus:outline-none bg-white"
                      >
                        {Object.entries(STATUS_LABELS).map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => setConfirmStatus(true)}
                        disabled={!newStatus || newStatus === record.status || savingStatus}
                        className="h-9 px-4 rounded-lg bg-papaya-orange text-white text-sm font-medium hover:bg-orange-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        {savingStatus ? "Guardando…" : "Guardar"}
                      </button>
                    </div>
                    {statusError && <p className="text-xs text-red-500">{statusError}</p>}
                  </div>

                  {/* Pagador selector */}
                  <div className="flex flex-col gap-1.5 flex-1 min-w-[180px]">
                    <label className="text-xs text-gray-400">Pagador</label>
                    <div className="flex gap-2 items-center">
                      <select
                        value={newPayerId}
                        onChange={e => setNewPayerId(e.target.value)}
                        className="h-9 flex-1 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 focus:border-papaya-orange focus:outline-none bg-white"
                      >
                        <option value="">Seleccionar…</option>
                        {pagadores.map((p: Pagador) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => setConfirmPayer(true)}
                        disabled={!newPayerId || newPayerId === record.payer_id || savingPayer}
                        className="h-9 px-4 rounded-lg bg-papaya-orange text-white text-sm font-medium hover:bg-orange-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        {savingPayer ? "Guardando…" : "Guardar"}
                      </button>
                    </div>
                    {payerError && <p className="text-xs text-red-500">{payerError}</p>}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Audit log */}
      <SectionCard icon={<FileText size={16} />} title="Historial de modificaciones">
        {auditLog.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileText size={28} className="text-gray-200 mb-2" />
            <p className="text-sm text-gray-400">Sin modificaciones registradas</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6 -mb-6">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-gray-50 border-y border-gray-100">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Fecha (NY)</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Usuario</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Acción</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cambios</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {auditLog.map(entry => (
                  <tr key={entry.id} className="hover:bg-gray-50/60 transition-colors align-top">
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{fmtDateNY(entry.created_at)}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{entry.user}</td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                        {ACTION_LABELS[entry.action] ?? entry.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ul className="space-y-0.5">
                        {Object.entries(entry.changes).map(([field, { from, to }]) => (
                          <li key={field} className="text-xs text-gray-700">
                            <span className="font-medium text-gray-500">{FIELD_LABELS[field] ?? field}:</span>{" "}
                            <span className="text-gray-400 line-through">{from ?? "—"}</span>
                            {" → "}
                            <span className="text-gray-800 font-medium">{to ?? "—"}</span>
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Chat log modal */}
      {showChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden" style={{ maxHeight: "80vh" }}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-papaya-orange" />
                <span className="text-sm font-semibold text-heading-text">Chat de la remesa</span>
              </div>
              <button onClick={() => setShowChat(false)} className="p-1 rounded hover:bg-gray-100 text-gray-400 transition-colors">
                <X size={16} />
              </button>
            </div>
            {/* Messages */}
            <div
              ref={chatScrollRef}
              className="flex-1 overflow-y-auto px-4 py-4 space-y-2"
            >
              {chatLoading ? (
                <div className="text-center text-sm text-gray-400 animate-pulse py-8">Cargando…</div>
              ) : chatLog.length === 0 ? (
                <div className="text-center text-sm text-gray-400 py-8">Sin historial de chat registrado</div>
              ) : chatLog.filter(m => !m.system).map((msg, i) => (
                <div key={i} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[78%] px-3 py-2 rounded-2xl text-sm leading-snug ${
                    msg.sender === "user"
                      ? "bg-papaya-orange text-white rounded-br-sm"
                      : "bg-gray-100 text-gray-800 rounded-bl-sm"
                  }`}>
                    <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                    <p className={`text-[10px] mt-1 ${msg.sender === "user" ? "text-white/60 text-right" : "text-gray-400"}`}>
                      {msg.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Confirm payer change dialog */}
      {confirmPayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-80 space-y-4">
            <h3 className="text-sm font-semibold text-heading-text">Confirmar cambio de pagador</h3>
            <p className="text-sm text-body-text">
              ¿Desea cambiar el pagador de la remesa <span className="font-mono text-papaya-orange">{record.id}</span>?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setConfirmPayer(false)} className="px-4 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={handleConfirmPayerChange} className="px-4 py-2 rounded-lg bg-papaya-orange text-white text-xs font-medium hover:bg-orange-500 transition-colors">
                Sí, cambiar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm status change dialog */}
      {confirmStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-80 space-y-4">
            <h3 className="text-sm font-semibold text-heading-text">Confirmar cambio de estado</h3>
            <p className="text-sm text-body-text">
              ¿Desea cambiar el estado de la remesa <span className="font-mono text-papaya-orange">{record.id}</span> a{" "}
              <span className="font-semibold">{STATUS_LABELS[newStatus] ?? newStatus}</span>?
              Esta acción quedará registrada en el historial.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setConfirmStatus(false)} className="px-4 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={handleConfirmStatusChange} className="px-4 py-2 rounded-lg bg-papaya-orange text-white text-xs font-medium hover:bg-orange-500 transition-colors">
                Sí, cambiar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
