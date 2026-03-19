import React, { useState, useMemo } from "react";
import { useAppStore } from "../../store/useAppStore";
import { api, Tariff, TariffIn } from "../../api";
import { Plus, Trash2, Copy, AlertTriangle, X, Check } from "lucide-react";
import { Pagination } from "../../components/ui/Pagination";

// ── Constants ─────────────────────────────────────────────────────────────────

const PAYMENT_METHODS: { value: string; label: string }[] = [
  { value: "creditCard", label: "Tarjeta de Crédito" },
  { value: "debitCard",  label: "Tarjeta de Débito"  },
  { value: "applePay",   label: "Apple Pay"           },
  { value: "googlePay",  label: "Google Pay"          },
];

const DISBURSEMENT_METHODS: { value: string; label: string }[] = [
  { value: "bank_deposit", label: "Depósito Bancario"  },
  { value: "cash_pickup",  label: "Retiro en Efectivo" },
  { value: "mobile_money", label: "Dinero Móvil"       },
  { value: "wallet",       label: "Billetera Digital"  },
];

const pmLabel  = (v: string) => PAYMENT_METHODS.find(m => m.value === v)?.label ?? v;
const dmLabel  = (v: string) => DISBURSEMENT_METHODS.find(m => m.value === v)?.label ?? v;

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(s: string) {
  return new Date(s).toLocaleString("es", { dateStyle: "short", timeStyle: "short" });
}


const emptyNew = (): Partial<TariffIn> => ({
  collector_id: "", payer_id: "",
  origin_country_id: "", destination_country_id: "",
  range_min: 20, range_max: 500,
  fee_flat: 0, fee_percentage: 0,
  payment_method: "creditCard",
  disbursement_method: "bank_deposit",
});

// ── Shared cell input styles ──────────────────────────────────────────────────

const cellInput = "w-full rounded border border-gray-300 px-2 py-1 text-xs font-mono focus:border-papaya-orange focus:outline-none bg-white";
const cellSelect = "w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-papaya-orange focus:outline-none bg-white";
const cellInputErr = "w-full rounded border border-red-400 px-2 py-1 text-xs font-mono focus:outline-none bg-red-50";

// ── Component ─────────────────────────────────────────────────────────────────

export const TariffsView = () => {
  const { gateways, pagadores, countries, tariffs, refreshTariffs } = useAppStore();

  const activeGateways  = gateways.filter(g => g.status === "active");
  const activePagadores = pagadores.filter(p => p.status === "active");

  // Filters
  const [fCollector,          setFCollector]          = useState("");
  const [fPayer,              setFPayer]              = useState("");
  const [fOrigin,             setFOrigin]             = useState("");
  const [fDest,               setFDest]               = useState("");
  const [fPaymentMethod,      setFPaymentMethod]      = useState("");
  const [fDisbursementMethod, setFDisbursementMethod] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // Sort
  type SortKey = keyof Pick<Tariff, "collector_id"|"payer_id"|"origin_country_id"|"destination_country_id"|"payment_method"|"disbursement_method"|"range_min"|"range_max"|"fee_flat"|"fee_percentage"|"created_at"|"updated_at">;
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc"|"desc">("asc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  // New row
  const [newRow,    setNewRow]    = useState<Partial<TariffIn> | null>(null);
  const [newError,  setNewError]  = useState<string | null>(null);
  const [newSaving, setNewSaving] = useState(false);

  // Inline edit
  const [editingId,   setEditingId]   = useState<number | null>(null);
  const [editForm,    setEditForm]    = useState<Partial<TariffIn>>({});
  const [editError,   setEditError]   = useState<string | null>(null);
  const [editSaving,  setEditSaving]  = useState(false);

  // Delete
  const [deleteId,    setDeleteId]    = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSaving,setDeleteSaving]= useState(false);

  const filtered = useMemo(() => {
    setPage(1);
    return tariffs.filter(t =>
      (!fCollector          || t.collector_id === fCollector) &&
      (!fPayer              || t.payer_id     === fPayer)     &&
      (!fOrigin             || t.origin_country_id === fOrigin) &&
      (!fDest               || t.destination_country_id === fDest) &&
      (!fPaymentMethod      || t.payment_method === fPaymentMethod) &&
      (!fDisbursementMethod || t.disbursement_method === fDisbursementMethod)
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tariffs, fCollector, fPayer, fOrigin, fDest, fPaymentMethod, fDisbursementMethod]);

  const sortedFiltered = useMemo(() => {
    if (!sortKey) return filtered;
    const nameKeys: Partial<Record<SortKey, (t: Tariff) => string>> = {
      collector_id:          t => activeGateways.find(g => g.id === t.collector_id)?.name ?? t.collector_id,
      payer_id:              t => activePagadores.find(p => p.id === t.payer_id)?.name ?? t.payer_id,
      origin_country_id:     t => countries.find(c => c.id === t.origin_country_id)?.name ?? t.origin_country_id,
      destination_country_id:t => countries.find(c => c.id === t.destination_country_id)?.name ?? t.destination_country_id,
    };
    return [...filtered].sort((a, b) => {
      const resolve = nameKeys[sortKey];
      const av = resolve ? resolve(a) : (a[sortKey] ?? "");
      const bv = resolve ? resolve(b) : (b[sortKey] ?? "");
      const cmp = typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av).localeCompare(String(bv), "es");
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir, activeGateways, activePagadores, countries]);

  const totalPages = Math.max(1, Math.ceil(sortedFiltered.length / PAGE_SIZE));
  const paginated  = sortedFiltered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const getName = (id: string, list: { id: string; name: string }[]) =>
    list.find(x => x.id === id)?.name ?? id;
  const getCountryName = (id: string) =>
    countries.find(c => c.id === id)?.name ?? id;

  // Countries cascading for new row
  const newCollectorCountries = useMemo(() => {
    const gw = gateways.find(g => g.id === newRow?.collector_id);
    return countries.filter(c => (gw?.origin_countries ?? []).includes(c.id) && c.send);
  }, [newRow?.collector_id, gateways, countries]);

  const newPayerCountries = useMemo(() => {
    const p = pagadores.find(p => p.id === newRow?.payer_id);
    return countries.filter(c => (p?.countries ?? []).includes(c.id) && c.receive);
  }, [newRow?.payer_id, pagadores, countries]);


  // ── New row handlers ─────────────────────────────────────────────────────────

  const startNew = () => {
    setEditingId(null);
    setNewRow(emptyNew());
    setNewError(null);
  };

  const cancelNew = () => { setNewRow(null); setNewError(null); };

  const setN = (k: keyof TariffIn, v: any) =>
    setNewRow(p => ({ ...p, [k]: v }));

  const saveNew = async () => {
    if (!newRow) return;
    if (!newRow.collector_id || !newRow.payer_id || !newRow.origin_country_id || !newRow.destination_country_id) {
      setNewError("Completa recolector, pagador y ambos países."); return;
    }
    setNewSaving(true);
    setNewError(null);
    try {
      await api.createTariff(newRow as TariffIn);
      await refreshTariffs();
      setNewRow(null);
    } catch (e: any) {
      setNewError(e.message || "Error al guardar.");
    } finally {
      setNewSaving(false);
    }
  };

  // ── Edit handlers ────────────────────────────────────────────────────────────

  const startEdit = (t: Tariff) => {
    setNewRow(null);
    setDeleteId(null);
    setEditingId(t.id);
    setEditForm({
      collector_id: t.collector_id,
      payer_id: t.payer_id,
      origin_country_id: t.origin_country_id,
      destination_country_id: t.destination_country_id,
      range_min: t.range_min,
      range_max: t.range_max,
      fee_flat: t.fee_flat,
      fee_percentage: t.fee_percentage,
      payment_method: t.payment_method,
      disbursement_method: t.disbursement_method,
    });
    setEditError(null);
  };

  const cancelEdit = () => { setEditingId(null); setEditError(null); };

  const setE = (k: keyof TariffIn, v: any) =>
    setEditForm(p => ({ ...p, [k]: v }));

  const saveEdit = async () => {
    setEditSaving(true);
    setEditError(null);
    try {
      await api.updateTariff(editingId!, editForm as TariffIn);
      await refreshTariffs();
      setEditingId(null);
    } catch (e: any) {
      setEditError(e.message || "Error al guardar.");
    } finally {
      setEditSaving(false);
    }
  };

  // ── Delete handlers ──────────────────────────────────────────────────────────

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleteSaving(true);
    setDeleteError(null);
    try {
      await api.deleteTariff(deleteId);
      await refreshTariffs();
      setDeleteId(null);
    } catch (e: any) {
      setDeleteError(e.message || "Error al eliminar.");
    } finally {
      setDeleteSaving(false);
    }
  };

  const startDuplicate = (t: Tariff) => {
    setEditingId(null);
    setDeleteId(null);
    setNewRow({
      collector_id: t.collector_id,
      payer_id: t.payer_id,
      origin_country_id: t.origin_country_id,
      destination_country_id: t.destination_country_id,
      range_min: t.range_min,
      range_max: t.range_max,
      fee_flat: t.fee_flat,
      fee_percentage: t.fee_percentage,
      payment_method: t.payment_method,
      disbursement_method: t.disbursement_method,
    });
    setNewError(null);
    setPage(1);
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Comisiones por combinación recolector · pagador · países · rango USD.</p>
        <button
          onClick={startNew}
          disabled={!!newRow}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-papaya-orange text-white text-sm font-medium hover:bg-orange-600 disabled:opacity-40 transition-colors"
        >
          <Plus size={15} /> Nueva Tarifa
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3 flex flex-wrap gap-3">
        {[
          { label: "Recolector", val: fCollector, set: setFCollector, opts: activeGateways },
          { label: "Pagador",    val: fPayer,     set: setFPayer,     opts: activePagadores },
        ].map(({ label, val, set, opts }) => (
          <div key={label}>
            <label className="block text-xs text-gray-400 mb-1">{label}</label>
            <select value={val} onChange={e => set(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:border-papaya-orange focus:outline-none">
              <option value="">Todos</option>
              {opts.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
        ))}
        {[
          { label: "País Origen",  val: fOrigin, set: setFOrigin, list: countries.filter(c => c.send) },
          { label: "País Destino", val: fDest,   set: setFDest,   list: countries.filter(c => c.receive) },
        ].map(({ label, val, set, list }) => (
          <div key={label}>
            <label className="block text-xs text-gray-400 mb-1">{label}</label>
            <select value={val} onChange={e => set(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:border-papaya-orange focus:outline-none">
              <option value="">Todos</option>
              {list.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        ))}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Método de Pago</label>
          <select value={fPaymentMethod} onChange={e => setFPaymentMethod(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:border-papaya-orange focus:outline-none">
            <option value="">Todos</option>
            {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Método de Entrega</label>
          <select value={fDisbursementMethod} onChange={e => setFDisbursementMethod(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:border-papaya-orange focus:outline-none">
            <option value="">Todos</option>
            {DISBURSEMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        {(fCollector || fPayer || fOrigin || fDest || fPaymentMethod || fDisbursementMethod) && (
          <div className="flex items-end">
            <button onClick={() => { setFCollector(""); setFPayer(""); setFOrigin(""); setFDest(""); setFPaymentMethod(""); setFDisbursementMethod(""); }}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">
              <X size={12} /> Limpiar
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {([
                  { label: "Recolector",     key: "collector_id"           },
                  { label: "Pagador",        key: "payer_id"               },
                  { label: "País Origen",    key: "origin_country_id"      },
                  { label: "País Destino",   key: "destination_country_id" },
                  { label: "Método de Pago",    key: "payment_method"      },
                  { label: "Método Entrega",    key: "disbursement_method" },
                  { label: "Rango Ini.",        key: "range_min"           },
                  { label: "Rango Fin",      key: "range_max"              },
                  { label: "Flat $",         key: "fee_flat"               },
                  { label: "Pct %",          key: "fee_percentage"         },
                  { label: "Creado",         key: "created_at"             },
                  { label: "Actualizado",    key: "updated_at"             },
                  { label: "",               key: null                     },
                ] as { label: string; key: SortKey | null }[]).map(({ label, key }) => (
                  <th key={label || "__actions"} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {key ? (
                      <button
                        onClick={() => handleSort(key)}
                        className="flex items-center gap-1 hover:text-gray-800 transition-colors group"
                      >
                        {label}
                        <span className="flex flex-col leading-none">
                          <span className={`text-[9px] leading-none ${sortKey === key && sortDir === "asc" ? "text-papaya-orange" : "text-gray-300 group-hover:text-gray-400"}`}>▲</span>
                          <span className={`text-[9px] leading-none ${sortKey === key && sortDir === "desc" ? "text-papaya-orange" : "text-gray-300 group-hover:text-gray-400"}`}>▼</span>
                        </span>
                      </button>
                    ) : label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">

              {/* ── New row (only on page 1) ── */}
              {newRow && page === 1 && (
                <>
                  <tr className="bg-blue-50/50">
                    {/* Collector */}
                    <td className="px-3 py-2">
                      <select value={newRow.collector_id ?? ""} onChange={e => setN("collector_id", e.target.value)}
                        className={cellSelect}>
                        <option value="">Recolector…</option>
                        {activeGateways.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                      </select>
                    </td>
                    {/* Payer */}
                    <td className="px-3 py-2">
                      <select value={newRow.payer_id ?? ""} onChange={e => setN("payer_id", e.target.value)}
                        className={cellSelect}>
                        <option value="">Pagador…</option>
                        {activePagadores.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </td>
                    {/* Origin */}
                    <td className="px-3 py-2">
                      <select value={newRow.origin_country_id ?? ""} onChange={e => setN("origin_country_id", e.target.value)}
                        disabled={!newRow.collector_id}
                        className={cellSelect + (newRow.collector_id ? "" : " opacity-40 cursor-not-allowed")}>
                        <option value="">País origen…</option>
                        {newCollectorCountries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </td>
                    {/* Destination */}
                    <td className="px-3 py-2">
                      <select value={newRow.destination_country_id ?? ""} onChange={e => setN("destination_country_id", e.target.value)}
                        disabled={!newRow.payer_id}
                        className={cellSelect + (newRow.payer_id ? "" : " opacity-40 cursor-not-allowed")}>
                        <option value="">País destino…</option>
                        {newPayerCountries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </td>
                    {/* Payment method */}
                    <td className="px-3 py-2">
                      <select value={newRow.payment_method ?? "creditCard"} onChange={e => setN("payment_method", e.target.value)}
                        className={cellSelect}>
                        {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                      </select>
                    </td>
                    {/* Disbursement method */}
                    <td className="px-3 py-2">
                      <select value={newRow.disbursement_method ?? "bank_deposit"} onChange={e => setN("disbursement_method", e.target.value)}
                        className={cellSelect}>
                        {DISBURSEMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                      </select>
                    </td>
                    {/* Range min */}
                    <td className="px-3 py-2">
                      <input type="number" min="20" max="500" step="1"
                        value={newRow.range_min ?? ""}
                        onChange={e => setN("range_min", parseFloat(e.target.value) || 0)}
                        className={cellInput}
                      />
                    </td>
                    {/* Range max */}
                    <td className="px-3 py-2">
                      <input type="number" min="20" max="500" step="1"
                        value={newRow.range_max ?? ""}
                        onChange={e => setN("range_max", parseFloat(e.target.value) || 0)}
                        className={cellInput}
                      />
                    </td>
                    {/* Fee flat */}
                    <td className="px-3 py-2">
                      <input type="number" min="0" step="0.01" placeholder="—"
                        value={newRow.fee_flat ?? ""}
                        disabled={(newRow.fee_percentage ?? 0) > 0}
                        onChange={e => {
                          const v = e.target.value === "" ? 0 : parseFloat(e.target.value) || 0;
                          setNewRow(p => ({ ...p, fee_flat: v, fee_percentage: v > 0 ? 0 : p?.fee_percentage }));
                        }}
                        className={cellInput + ((newRow.fee_percentage ?? 0) > 0 ? " opacity-30 cursor-not-allowed" : "")}
                      />
                    </td>
                    {/* Fee pct */}
                    <td className="px-3 py-2">
                      <input type="number" min="0" step="0.01" placeholder="—"
                        value={newRow.fee_percentage ?? ""}
                        disabled={(newRow.fee_flat ?? 0) > 0}
                        onChange={e => {
                          const v = e.target.value === "" ? 0 : parseFloat(e.target.value) || 0;
                          setNewRow(p => ({ ...p, fee_percentage: v, fee_flat: v > 0 ? 0 : p?.fee_flat }));
                        }}
                        className={cellInput + ((newRow.fee_flat ?? 0) > 0 ? " opacity-30 cursor-not-allowed" : "")}
                      />
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-300">—</td>
                    <td className="px-3 py-2 text-xs text-gray-300">—</td>
                    {/* Actions */}
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <button onClick={saveNew} disabled={newSaving}
                          className="p-1.5 rounded hover:bg-green-100 text-green-600 disabled:opacity-40 transition-colors" title="Guardar">
                          <Check size={14} />
                        </button>
                        <button onClick={cancelNew}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title="Cancelar">
                          <X size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {newError && (
                    <tr className="bg-red-50">
                      <td colSpan={13} className="px-4 py-2 text-xs text-red-700 flex items-center gap-1">
                        <AlertTriangle size={12} className="inline mr-1 text-red-500" />{newError}
                      </td>
                    </tr>
                  )}
                </>
              )}

              {/* ── Data rows ── */}
              {filtered.length === 0 && !newRow ? (
                <tr>
                  <td colSpan={13} className="px-4 py-10 text-center text-sm text-gray-400">
                    No hay tarifas configuradas.
                  </td>
                </tr>
              ) : paginated.map(t => {
                const isEditing = editingId === t.id;
                const isDeleting = deleteId === t.id;
                const hasOverlap = t.has_overlap;
                const rangeClass = hasOverlap
                  ? "inline-block bg-red-100 border border-red-300 text-red-700 rounded px-1.5 py-0.5 font-mono text-xs"
                  : "font-mono text-xs text-gray-700";

                if (isDeleting) {
                  return (
                    <tr key={t.id} className="bg-red-50/60">
                      <td colSpan={11} className="px-4 py-2.5 text-sm text-gray-700">
                        {deleteError
                          ? <span className="text-amber-700"><AlertTriangle size={12} className="inline mr-1" />{deleteError}</span>
                          : <span>¿Eliminar tarifa <strong>{getName(t.collector_id, activeGateways)} → {getCountryName(t.destination_country_id)}</strong>? Esta acción no se puede deshacer.</span>
                        }
                      </td>
                      <td colSpan={2} className="px-3 py-2.5">
                        <div className="flex items-center gap-2 justify-end">
                          {!deleteError && (
                            <button onClick={confirmDelete} disabled={deleteSaving}
                              className="px-3 py-1 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                              {deleteSaving ? "…" : "Eliminar"}
                            </button>
                          )}
                          <button onClick={() => { setDeleteId(null); setDeleteError(null); }}
                            className="px-3 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">
                            {deleteError ? "Cerrar" : "Cancelar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                if (isEditing) {
                  return (
                    <>
                      <tr key={t.id} className="bg-yellow-50/50">
                        <td className="px-3 py-2 text-xs text-gray-700 whitespace-nowrap">{getName(t.collector_id, activeGateways)}</td>
                        <td className="px-3 py-2 text-xs text-gray-700 whitespace-nowrap">{getName(t.payer_id, activePagadores)}</td>
                        <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{getCountryName(t.origin_country_id)}</td>
                        <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{getCountryName(t.destination_country_id)}</td>
                        {/* Payment method */}
                        <td className="px-3 py-2">
                          <select value={editForm.payment_method ?? "creditCard"} onChange={e => setE("payment_method", e.target.value)}
                            className={cellSelect}>
                            {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                          </select>
                        </td>
                        {/* Disbursement method */}
                        <td className="px-3 py-2">
                          <select value={editForm.disbursement_method ?? "bank_deposit"} onChange={e => setE("disbursement_method", e.target.value)}
                            className={cellSelect}>
                            {DISBURSEMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                          </select>
                        </td>
                        {/* Range min */}
                        <td className="px-3 py-2">
                          <input type="number" min="20" max="500" step="1"
                            value={editForm.range_min ?? ""}
                            onChange={e => setE("range_min", parseFloat(e.target.value) || 0)}
                            className={cellInput}
                          />
                        </td>
                        {/* Range max */}
                        <td className="px-3 py-2">
                          <input type="number" min="20" max="500" step="1"
                            value={editForm.range_max ?? ""}
                            onChange={e => setE("range_max", parseFloat(e.target.value) || 0)}
                            className={cellInput}
                          />
                        </td>
                        {/* Fee flat */}
                        <td className="px-3 py-2">
                          <input type="number" min="0" step="0.01" placeholder="—"
                            value={editForm.fee_flat ?? ""}
                            disabled={(editForm.fee_percentage ?? 0) > 0}
                            onChange={e => {
                              const v = e.target.value === "" ? 0 : parseFloat(e.target.value) || 0;
                              setEditForm(p => ({ ...p, fee_flat: v, fee_percentage: v > 0 ? 0 : p.fee_percentage }));
                            }}
                            className={cellInput + ((editForm.fee_percentage ?? 0) > 0 ? " opacity-30 cursor-not-allowed" : "")}
                          />
                        </td>
                        {/* Fee pct */}
                        <td className="px-3 py-2">
                          <input type="number" min="0" step="0.01" placeholder="—"
                            value={editForm.fee_percentage ?? ""}
                            disabled={(editForm.fee_flat ?? 0) > 0}
                            onChange={e => {
                              const v = e.target.value === "" ? 0 : parseFloat(e.target.value) || 0;
                              setEditForm(p => ({ ...p, fee_percentage: v, fee_flat: v > 0 ? 0 : p.fee_flat }));
                            }}
                            className={cellInput + ((editForm.fee_flat ?? 0) > 0 ? " opacity-30 cursor-not-allowed" : "")}
                          />
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-400 whitespace-nowrap">{fmtDate(t.created_at)}</td>
                        <td className="px-3 py-2 text-xs text-gray-400 whitespace-nowrap">{fmtDate(t.updated_at)}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            <button onClick={saveEdit} disabled={editSaving}
                              className="p-1.5 rounded hover:bg-green-100 text-green-600 disabled:opacity-40 transition-colors" title="Guardar">
                              <Check size={14} />
                            </button>
                            <button onClick={cancelEdit}
                              className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title="Cancelar">
                              <X size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {editError && (
                        <tr className="bg-red-50">
                          <td colSpan={13} className="px-4 py-2 text-xs text-red-700">
                            <AlertTriangle size={12} className="inline mr-1 text-red-500" />{editError}
                          </td>
                        </tr>
                      )}
                    </>
                  );
                }

                return (
                  <tr key={t.id} className={`hover:bg-gray-50 transition-colors ${hasOverlap ? "bg-red-50/30" : ""}`}>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs text-gray-800">{getName(t.collector_id, activeGateways)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs text-gray-800">{getName(t.payer_id, activePagadores)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs text-gray-600">{getCountryName(t.origin_country_id)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs text-gray-600">{getCountryName(t.destination_country_id)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs text-gray-600">{pmLabel(t.payment_method)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs text-gray-600">{dmLabel(t.disbursement_method)}</td>
                    <td className="px-3 py-2.5">
                      <span className={rangeClass}>{t.range_min}</span>
                      {hasOverlap && <AlertTriangle size={11} className="inline ml-1 text-red-500" />}
                    </td>
                    <td className="px-3 py-2.5"><span className={rangeClass}>{t.range_max}</span></td>
                    <td className="px-3 py-2.5 font-mono text-xs text-gray-700">{t.fee_flat ?? "—"}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-gray-700">{t.fee_percentage != null ? `${t.fee_percentage}%` : "—"}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-400 whitespace-nowrap">{fmtDate(t.created_at)}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-400 whitespace-nowrap">{fmtDate(t.updated_at)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => startEdit(t)}
                          className="p-1.5 rounded hover:bg-blue-50 text-blue-500 hover:text-blue-700 transition-colors" title="Editar">
                          ✎
                        </button>
                        <button onClick={() => startDuplicate(t)}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title="Duplicar">
                          <Copy size={14} />
                        </button>
                        <button onClick={() => { setDeleteId(t.id); setDeleteError(null); setEditingId(null); }}
                          className="p-1.5 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors" title="Eliminar">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {tariffs.some(t => t.has_overlap) && (
          <div className="px-4 py-2.5 bg-red-50 border-t border-red-200 flex items-center gap-2">
            <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
            <p className="text-xs text-red-700">
              {(() => { const n = tariffs.filter(t => t.has_overlap).length; return <>Existen <strong>{n}</strong> tarifa{n !== 1 ? "s" : ""} con rangos solapados. Corrígelas antes de usar la calculadora.</>; })()}
            </p>
          </div>
        )}

        {/* Pagination */}
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          totalItems={sortedFiltered.length}
          pageSize={PAGE_SIZE}
        />
      </div>

    </div>
  );
};
