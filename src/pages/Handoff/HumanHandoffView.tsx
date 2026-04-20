import React, { useState, useEffect, useCallback, useRef } from "react";
import { Search, X, HelpCircle, Send, Minimize2, MessageSquare, Clock, FileText, ArrowLeftRight, Bell, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { api, HandoffRequest, HandoffMessage, HandoffNote, RemittanceRecord } from "../../api";
import { Pagination } from "../../components/ui/Pagination";
import favicon from "../../../assets/favicon.jpeg";

const PAGE_SIZE = 20;
const AGENT_ID  = "admin@mipapaya.com";

const STATUS_LABELS: Record<string, string> = {
  pendiente:  "Pendiente",
  en_proceso: "En proceso",
  cerrado:    "Cerrado",
};
const STATUS_COLORS: Record<string, string> = {
  pendiente:  "bg-yellow-50 text-yellow-700",
  en_proceso: "bg-blue-50 text-blue-700",
  cerrado:    "bg-gray-100 text-gray-500",
};

function fmtDateNY(utcStr: string) {
  if (!utcStr) return "—";
  const iso = utcStr.includes("T") ? utcStr : utcStr.replace(" ", "T") + "Z";
  return new Date(iso).toLocaleString("es", { timeZone: "America/New_York", dateStyle: "short", timeStyle: "short" });
}

function elapsed(utcStr: string): string {
  if (!utcStr) return "—";
  const iso = utcStr.includes("T") ? utcStr : utcStr.replace(" ", "T") + "Z";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1)  return "ahora";
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function playBeep(freq = 880, dur = 180, vol = 0.35) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = freq; osc.type = "sine";
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur / 1000);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + dur / 1000);
  } catch {}
}

function notifyBrowser(title: string, body: string) {
  if (Notification.permission === "granted") {
    new Notification(title, { body, icon: "/favicon.jpeg" });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then(p => {
      if (p === "granted") new Notification(title, { body, icon: "/favicon.jpeg" });
    });
  }
}

const sel = "rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:border-papaya-orange focus:outline-none bg-white";
const inp = "rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:border-papaya-orange focus:outline-none bg-white";

const QUICK_REPLIES = [
  "¡Hola! Soy un agente de MiPapaya. ¿En qué puedo ayudarte?",
  "Un momento por favor, estoy revisando tu caso.",
  "¿Puedes darme más detalles sobre tu situación?",
  "Entiendo tu consulta. Voy a verificar esa información.",
  "Tu caso ha sido resuelto. ¡Que tengas un excelente día! 🙏",
];

// ── Agent Chat Modal ──────────────────────────────────────────────────────────

type ModalTab = "chat" | "historial" | "notas";

interface ChatModalProps {
  request: HandoffRequest;
  onClose: () => void;
  onRefresh: () => void;
}

function AgentChatModal({ request, onClose, onRefresh }: ChatModalProps) {
  const [messages, setMessages]       = useState<HandoffMessage[]>([]);
  const [text, setText]               = useState("");
  const [sending, setSending]         = useState(false);
  const [closing, setClosing]         = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [userTyping, setUserTyping]   = useState(false);
  const [tab, setTab]                 = useState<ModalTab>("chat");
  const [notes, setNotes]             = useState<HandoffNote[]>([]);
  const [noteText, setNoteText]       = useState("");
  const [savingNote, setSavingNote]   = useState(false);
  const [remittances, setRemittances] = useState<RemittanceRecord[]>([]);
  const [loadingRem, setLoadingRem]   = useState(false);
  const scrollRef  = useRef<HTMLDivElement>(null);
  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastIdRef  = useRef(0);

  const scrollToBottom = () => setTimeout(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, 50);

  const loadMessages = useCallback(async () => {
    try {
      const res = await api.getHandoffMessages(request.id, lastIdRef.current);
      if (res.messages.length > 0) {
        setMessages(p => {
          const existingIds = new Set(p.map(m => m.id));
          const newMsgs = res.messages.filter(m => !existingIds.has(m.id));
          if (newMsgs.length === 0) return p;
          return [...p, ...newMsgs];
        });
        lastIdRef.current = res.messages[res.messages.length - 1].id;
        scrollToBottom();
      }
      setUserTyping(res.user_typing);
      if (res.status === "cerrado" && request.status !== "cerrado") {
        onRefresh();
      }
    } catch {}
  }, [request.id]);

  // Load notes feed when tab switches to notas
  useEffect(() => {
    if (tab !== "notas") return;
    api.getHandoffNotes(request.id).then(res => setNotes(res.notes)).catch(() => {});
  }, [tab, request.id]);

  useEffect(() => {
    // Load all messages on open
    api.getHandoffMessages(request.id, 0).then(res => {
      setMessages(res.messages);
      if (res.messages.length > 0) lastIdRef.current = res.messages[res.messages.length - 1].id;
      scrollToBottom();
    }).catch(() => {});

    // Mark as en_proceso if pendiente
    if (request.status === "pendiente") {
      api.updateHandoffStatus(request.id, "en_proceso", AGENT_ID).then(onRefresh).catch(() => {});
    }

    pollRef.current = setInterval(loadMessages, 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [request.id]);

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Load remittances when switching to historial tab
  useEffect(() => {
    if (tab !== "historial" || !request.client_phone) return;
    setLoadingRem(true);
    api.getRemittances({ client_id: request.client_phone, limit: 100 })
      .then(res => setRemittances(res.items))
      .catch(() => {})
      .finally(() => setLoadingRem(false));
  }, [tab, request.client_phone]);

  const handleTyping = (val: string) => {
    setText(val);
    api.setHandoffTyping(request.id, "agent").catch(() => {});
    if (typingRef.current) clearTimeout(typingRef.current);
  };

  const send = async (msg?: string) => {
    const toSend = (msg ?? text).trim();
    if (!toSend) return;
    setSending(true);
    try {
      const res = await api.postHandoffMessage(request.id, toSend);
      setMessages(p => [...p, { id: res.id, sender: "agent" as const, text: toSend, created_at: new Date().toISOString() }]);
      lastIdRef.current = res.id; // avoid poll duplicating this message
      setText("");
      scrollToBottom();
    } finally {
      setSending(false);
    }
  };

  const addNote = async () => {
    const trimmed = noteText.trim();
    if (!trimmed) return;
    setSavingNote(true);
    try {
      const note = await api.addHandoffNote(request.id, trimmed);
      setNotes(p => [...p, note]);
      setNoteText("");
    } finally {
      setSavingNote(false);
    }
  };

  const sendReport = async () => {
    setGeneratingReport(true);
    try {
      const res = await api.generateHandoffReport(request.id);
      await send(`📊 Aquí está tu resumen de movimientos. Descárgalo aquí 👉 ${res.report_url}`);
    } catch {
      // silently fail — agent sees nothing changed
    } finally {
      setGeneratingReport(false);
    }
  };

  const closeCase = async () => {
    setClosing(true);
    try { await api.updateHandoffStatus(request.id, "cerrado"); onClose(); }
    finally { setClosing(false); }
  };

  const isReadOnly = request.status === "cerrado";


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden" style={{ height: 620 }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
              <img src={favicon} alt="MiPapaya" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {request.client_name || request.client_phone || "Cliente"}
              </p>
              <p className="text-xs text-gray-400">{request.client_phone} · {elapsed(request.created_at)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${STATUS_COLORS[request.status]}`}>
              {STATUS_LABELS[request.status]}
            </span>
            {!isReadOnly && (
              <button onClick={closeCase} disabled={closing}
                className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-medium transition-colors disabled:opacity-60">
                {closing ? "Cerrando..." : "Cerrar caso"}
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
              <Minimize2 size={15} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 flex-shrink-0">
          {([
            { id: "chat", label: "Chat", icon: <MessageSquare size={13} /> },
            { id: "historial", label: "Historial", icon: <ArrowLeftRight size={13} /> },
            { id: "notas", label: "Notas", icon: <FileText size={13} /> },
          ] as { id: ModalTab; label: string; icon: React.ReactNode }[]).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? "border-papaya-orange text-papaya-orange"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* ── Chat Tab ── */}
        {tab === "chat" && (
          <>
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-4 py-3 space-y-2"
              style={{ scrollbarWidth: "thin", scrollbarColor: "#f97316 transparent" }}
            >
              {messages.length === 0 && (
                <p className="text-center text-sm text-gray-400 mt-8">Sin mensajes aún</p>
              )}
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.sender === "agent" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm ${
                    m.sender === "agent"
                      ? "bg-papaya-orange text-white rounded-br-sm"
                      : "bg-gray-100 text-gray-800 rounded-bl-sm"
                  }`}>
                    <p>{m.text}</p>
                    <p className={`text-[10px] mt-1 ${m.sender === "agent" ? "text-orange-100" : "text-gray-400"}`}>
                      {fmtDateNY(m.created_at)}
                    </p>
                  </div>
                </div>
              ))}
              {userTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 px-3.5 py-2.5 rounded-2xl rounded-bl-sm">
                    <div className="flex gap-1 items-center h-4">
                      {[0, 0.2, 0.4].map((d, i) => (
                        <span key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${d}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick replies */}
            {!isReadOnly && (
              <div className="px-4 pt-2 flex gap-1.5 flex-wrap flex-shrink-0">
                {QUICK_REPLIES.map((q, i) => (
                  <button key={i} onClick={() => send(q)}
                    className="text-[11px] px-2.5 py-1 rounded-full border border-orange-200 text-orange-600 hover:bg-orange-50 transition-colors text-left">
                    {q}
                  </button>
                ))}
                <button onClick={sendReport} disabled={generatingReport}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-papaya-orange text-white hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center gap-1">
                  {generatingReport ? "Generando…" : "📊 Reporte movimientos"}
                </button>
              </div>
            )}

            {/* Input */}
            {!isReadOnly ? (
              <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 flex-shrink-0">
                <input
                  type="text" value={text}
                  onChange={e => handleTyping(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
                  placeholder="Escribe un mensaje..."
                  className="flex-1 rounded-lg border border-gray-200 px-3.5 py-2 text-sm focus:border-papaya-orange focus:outline-none"
                />
                <button onClick={() => send()} disabled={sending || !text.trim()}
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-papaya-orange hover:bg-orange-600 text-white disabled:opacity-50 transition-colors flex-shrink-0">
                  <Send size={15} />
                </button>
              </div>
            ) : (
              <div className="px-4 py-3 border-t border-gray-100 flex-shrink-0">
                <p className="text-xs text-center text-gray-400">Caso cerrado · solo lectura</p>
              </div>
            )}
          </>
        )}

        {/* ── Historial Tab ── */}
        {tab === "historial" && (
          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#f97316 transparent" }}>
            {!request.client_phone && (
              <p className="text-sm text-gray-400 text-center mt-8">Sin cliente identificado</p>
            )}
            {loadingRem && <p className="text-sm text-gray-400 text-center mt-8">Cargando...</p>}
            {!loadingRem && remittances.length === 0 && request.client_phone && (
              <p className="text-sm text-gray-400 text-center mt-8">Sin remesas registradas</p>
            )}
            {!loadingRem && remittances.length > 0 && (
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 sticky top-0">
                    <th className="text-left px-4 py-2.5 text-gray-500 font-semibold uppercase tracking-wide">Fecha</th>
                    <th className="text-left px-4 py-2.5 text-gray-500 font-semibold uppercase tracking-wide">Monto</th>
                    <th className="text-left px-4 py-2.5 text-gray-500 font-semibold uppercase tracking-wide">Destino</th>
                    <th className="text-left px-4 py-2.5 text-gray-500 font-semibold uppercase tracking-wide">Estado</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {remittances.map(r => (
                    <tr key={r.id} className="hover:bg-orange-50/30 transition-colors">
                      <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{fmtDateNY(r.created_at)}</td>
                      <td className="px-4 py-2.5 font-semibold text-gray-800 whitespace-nowrap">{(r.sent_amount_local ?? (r.sent_amount_usd ?? 0) * r.collector_rate).toLocaleString("es", {minimumFractionDigits: 2, maximumFractionDigits: 2})} {r.sent_currency}</td>
                      <td className="px-4 py-2.5 text-gray-600">{r.destination_country_id}</td>
                      <td className="px-4 py-2.5">
                        <span className={`font-medium px-2 py-0.5 rounded-full ${
                          r.status === "payed"     ? "bg-green-50 text-green-700" :
                          r.status === "pending"   ? "bg-yellow-50 text-yellow-700" :
                          r.status === "transmited"? "bg-blue-50 text-blue-700" :
                          r.status === "unpayed"   ? "bg-red-50 text-red-600" :
                          "bg-gray-100 text-gray-500"
                        }`}>
                          {r.status === "payed" ? "Pagada" : r.status === "pending" ? "Pendiente" :
                           r.status === "transmited" ? "Transmitida" : r.status === "unpayed" ? "No pagada" : "Cancelada"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <Link
                          to={`/remesas/${r.id}`}
                          state={{ from: "soporte" }}
                          className="flex items-center gap-1 text-papaya-orange hover:text-orange-600 font-medium whitespace-nowrap"
                        >
                          Ver <ArrowRight size={11} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── Notas Tab ── */}
        {tab === "notas" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Notes feed */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5" style={{ scrollbarWidth: "thin", scrollbarColor: "#f97316 transparent" }}>
              {notes.length === 0 && (
                <p className="text-center text-sm text-gray-400 mt-8">Sin notas aún</p>
              )}
              {notes.map(n => (
                <div key={n.id} className="bg-amber-50 border border-amber-100 rounded-xl px-3.5 py-2.5">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{n.text}</p>
                  <p className="text-[10px] text-amber-500 mt-1.5">
                    {n.agent_id} · {fmtDateNY(n.created_at)}
                  </p>
                </div>
              ))}
            </div>
            {/* Add note input */}
            <div className="flex items-end gap-2 px-4 py-3 border-t border-gray-100 flex-shrink-0">
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), addNote())}
                placeholder="Escribe una nota interna..."
                rows={2}
                className="flex-1 rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm focus:border-papaya-orange focus:outline-none resize-none"
              />
              <button onClick={addNote} disabled={savingNote || !noteText.trim()}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-papaya-orange hover:bg-orange-600 text-white disabled:opacity-50 transition-colors flex-shrink-0">
                <Send size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main View ─────────────────────────────────────────────────────────────────

export const HumanHandoffView = () => {
  const [items, setItems]     = useState<HandoffRequest[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(false);
  const [elapsed_, setElapsed_] = useState(0); // tick for relative times

  const [fStatus,   setFStatus]   = useState<string[]>(["pendiente", "en_proceso"]);
  const [statusOpen, setStatusOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);
  const [fSearch,   setFSearch]   = useState("");
  const [fDateFrom, setFDateFrom] = useState("");
  const [fDateTo,   setFDateTo]   = useState("");
  const [myOnly,    setMyOnly]    = useState(false);

  const [activeRequest, setActiveRequest] = useState<HandoffRequest | null>(null);

  const prevCountRef = useRef(0);
  const autoRefRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  // Close status dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) setStatusOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Tick every minute to refresh relative times
  useEffect(() => {
    const id = setInterval(() => setElapsed_(n => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const buildFilters = useCallback(() => ({
    status:    fStatus.length ? fStatus.join(",") : undefined,
    search:    fSearch    || undefined,
    date_from: fDateFrom  || undefined,
    date_to:   fDateTo    || undefined,
    agent_id:  myOnly ? AGENT_ID : undefined,
  }), [fStatus, fSearch, fDateFrom, fDateTo, myOnly]);

  const load = useCallback(async (p: number, filters: Parameters<typeof api.getHandoffRequests>[0]) => {
    setLoading(true);
    try {
      const res = await api.getHandoffRequests({ ...filters, limit: PAGE_SIZE, offset: (p - 1) * PAGE_SIZE });
      setItems(res.items);
      setTotal(res.total);

      // Sound + notification on new pending
      const pendingNow = res.items.filter(i => i.status === "pendiente").length;
      if (prevCountRef.current > 0 && pendingNow > prevCountRef.current) {
        playBeep();
        notifyBrowser("MiPapaya Soporte", `Nueva solicitud de soporte`);
      }
      prevCountRef.current = pendingNow;
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + auto-refresh every 30s
  useEffect(() => {
    load(page, buildFilters());
    if (autoRefRef.current) clearInterval(autoRefRef.current);
    autoRefRef.current = setInterval(() => load(page, buildFilters()), 30_000);
    return () => { if (autoRefRef.current) clearInterval(autoRefRef.current); };
  }, [page, myOnly]);

  const applyFilters = () => {
    setPage(1);
    load(1, buildFilters());
  };

  const clearFilters = () => {
    setFStatus(["pendiente", "en_proceso"]); setFSearch(""); setFDateFrom(""); setFDateTo(""); setMyOnly(false);
    setPage(1);
    load(1, {});
  };

  const openRequest = async (req: HandoffRequest) => {
    try {
      const fresh = await api.getHandoffRequest(req.id);
      setActiveRequest(fresh);
    } catch {
      setActiveRequest(req);
    }
  };

  const refresh = () => load(page, buildFilters());

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Request browser notification permission on mount
  useEffect(() => {
    if (Notification.permission === "default") Notification.requestPermission();
  }, []);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-papaya-orange/10 flex items-center justify-center">
            <HelpCircle size={20} className="text-papaya-orange" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Soporte Humano</h1>
            <p className="text-sm text-gray-500">{total} solicitudes</p>
          </div>
        </div>
        <button
          onClick={() => { setMyOnly(m => !m); setPage(1); }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
            myOnly ? "bg-papaya-orange text-white border-papaya-orange" : "bg-white text-gray-600 border-gray-200 hover:border-papaya-orange"
          }`}
        >
          <Bell size={14} />
          Mis casos
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Buscar</label>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={fSearch} onChange={e => setFSearch(e.target.value)}
              onKeyDown={e => e.key === "Enter" && applyFilters()}
              placeholder="Teléfono o nombre..." className={`${inp} pl-8`} />
          </div>
        </div>
        <div className="flex flex-col gap-1" ref={statusRef}>
          <label className="text-xs text-gray-500">Estado</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setStatusOpen(o => !o)}
              className={`${sel} flex items-center justify-between gap-2 min-w-[160px]`}
            >
              <span className="truncate">
                {fStatus.length === 0
                  ? "Todos"
                  : fStatus.map(s => STATUS_LABELS[s]).join(", ")}
              </span>
              <svg className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform ${statusOpen ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </button>
            {statusOpen && (
              <div className="absolute top-full left-0 mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[160px]">
                {[
                  { value: "pendiente",  label: "Pendiente"  },
                  { value: "en_proceso", label: "En proceso" },
                  { value: "cerrado",    label: "Cerrado"    },
                ].map(opt => (
                  <label key={opt.value} className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fStatus.includes(opt.value)}
                      onChange={e => {
                        setFStatus(prev =>
                          e.target.checked ? [...prev, opt.value] : prev.filter(s => s !== opt.value)
                        );
                      }}
                      className="accent-papaya-orange w-3.5 h-3.5"
                    />
                    <span className="text-sm text-gray-700">{opt.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Desde</label>
          <input type="date" value={fDateFrom} onChange={e => setFDateFrom(e.target.value)} className={inp} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Hasta</label>
          <input type="date" value={fDateTo} onChange={e => setFDateTo(e.target.value)} className={inp} />
        </div>
        <button onClick={applyFilters}
          className="px-4 py-1.5 rounded-lg bg-papaya-orange text-white text-sm font-medium hover:bg-orange-600 transition-colors">
          Filtrar
        </button>
        <button onClick={clearFilters} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha NYC</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <Clock size={11} className="inline mr-1" />Espera
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Teléfono</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nombre</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Agente</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading && (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">Cargando...</td></tr>
            )}
            {!loading && items.length === 0 && (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">Sin solicitudes</td></tr>
            )}
            {!loading && items.map(r => (
              <tr key={r.id} onClick={() => openRequest(r)}
                className="hover:bg-orange-50/40 cursor-pointer transition-colors">
                <td className="px-4 py-3 text-gray-700 text-xs">{fmtDateNY(r.created_at)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium ${r.status === "pendiente" ? "text-red-500" : "text-gray-400"}`}>
                    {elapsed(r.created_at)}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-gray-700 text-xs">{r.client_phone || "—"}</td>
                <td className="px-4 py-3 text-gray-700">{r.client_name || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${STATUS_COLORS[r.status]}`}>
                    {STATUS_LABELS[r.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{r.agent_id || "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={e => { e.stopPropagation(); openRequest(r); }}
                      className="flex items-center gap-1 text-xs text-papaya-orange hover:text-orange-600 font-medium">
                      <MessageSquare size={13} />
                      {r.status === "pendiente" ? "Atender" : "Ver chat"}
                    </button>
                    {(r.unread_count ?? 0) > 0 && (
                      <span className="min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {r.unread_count}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-3 border-t border-gray-100">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} alwaysShow />
        </div>
      </div>

      {activeRequest && (
        <AgentChatModal
          request={activeRequest}
          onClose={() => { setActiveRequest(null); refresh(); }}
          onRefresh={() => {
            refresh();
            api.getHandoffRequest(activeRequest.id).then(setActiveRequest).catch(() => {});
          }}
        />
      )}
    </div>
  );
};
