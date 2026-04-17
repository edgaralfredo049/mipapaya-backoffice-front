import React, { useState, useEffect, useRef } from "react";
import { useAppStore } from "../../store/useAppStore";
import { useAuthStore } from "../../store/useAuthStore";
import { api, ExchangeRateIn, CalculateAmountResult, DeliveryFlow, DeliveryMethodType } from "../../api";
import { AlertTriangle, TrendingUp, RotateCcw, Save, Calculator, ArrowRight, Loader2, Zap, Clock, DollarSign, Receipt, RefreshCw, Wifi } from "lucide-react";
import { PAGADOR_COLORS } from "../../data/constants";

// ── Calculator error card ──────────────────────────────────────────────────────

type CalcErrorType = "ALTERNANCIA" | "TASA_PAGADOR" | "TASA_RECOLECTOR" | "RECOLECTOR" | "MONTO_RANGO" | "TARIFA" | "FX" | "UNKNOWN";

const ERROR_META: Record<CalcErrorType, { title: string; hint: string; Icon: React.ElementType; color: string }> = {
  ALTERNANCIA:      { title: "Sin pagador para ese horario y monto",  hint: "Ve a Configuración → Alternancia y asigna un pagador para este país, rango de monto y método.",  Icon: Clock,       color: "text-orange-500" },
  TASA_PAGADOR:     { title: "Tasa de cambio del pagador faltante",   hint: "El pagador asignado no tiene tasa de cambio. Ve a Tasas de Cambio → Pagadores.",                  Icon: RefreshCw,   color: "text-amber-500"  },
  TASA_RECOLECTOR:  { title: "Tasa de cambio del recolector faltante",hint: "El recolector no tiene tasa de cambio. Ve a Tasas de Cambio → Recolectores.",                     Icon: RefreshCw,   color: "text-amber-500"  },
  RECOLECTOR:       { title: "Sin recolector activo",                 hint: "No hay un recolector activo para el país de origen. Ve a Configuración → Recolectores.",           Icon: Wifi,        color: "text-red-500"    },
  MONTO_RANGO:      { title: "Monto fuera del rango permitido",       hint: "Los envíos deben estar entre $20 y $500 USD. Ajusta el monto.",                                    Icon: DollarSign,  color: "text-red-500"    },
  TARIFA:           { title: "Sin tarifa configurada",                hint: "No hay tarifa para este corredor y método de pago. Ve a Configuración → Tarifas.",                 Icon: Receipt,     color: "text-red-500"    },
  FX:               { title: "Margen FX sin configurar",              hint: "El pagador no tiene FX% para este país. Edítalo en Configuración → Pagadores.",                   Icon: TrendingUp,  color: "text-red-500"    },
  UNKNOWN:          { title: "Error en el cálculo",                   hint: "Revisa la configuración del corredor.",                                                             Icon: AlertTriangle, color: "text-red-500"  },
};

function parseCalcError(raw: string): { type: CalcErrorType; detail: string } {
  const sep = raw.indexOf("|");
  if (sep === -1) return { type: "UNKNOWN", detail: raw };
  const code = raw.slice(0, sep) as CalcErrorType;
  const detail = raw.slice(sep + 1).trim();
  return { type: code in ERROR_META ? code : "UNKNOWN", detail };
}

const CalcErrorCard = ({ message }: { message: string }) => {
  const { type, detail } = parseCalcError(message);
  const { title, hint, Icon, color } = ERROR_META[type];
  return (
    <div className="rounded-xl border border-red-100 bg-red-50/60 p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Icon size={15} className={`${color} shrink-0`} />
        <p className="text-sm font-semibold text-gray-800">{title}</p>
      </div>
      <p className="text-xs text-gray-600 leading-relaxed">{detail}</p>
      <p className="text-xs text-gray-400 italic leading-relaxed">{hint}</p>
    </div>
  );
};

// ── Rates view ────────────────────────────────────────────────────────────────

type Tab = "pagador" | "gateway";

const ENTITY_LABEL: Record<Tab, { singular: string; plural: string }> = {
  pagador:  { singular: "pagador",     plural: "Pagadores"    },
  gateway:  { singular: "recolector",  plural: "Recolectores" },
};

const getInitialColor = (index: number) =>
  PAGADOR_COLORS[index % PAGADOR_COLORS.length];

const DELIVERY_METHOD_LABEL: Record<DeliveryMethodType, string> = {
  cash_pickup:   "Efectivo",
  mobile_wallet: "Billetera Movil",
  bank_deposit:  "Transferencia Bancaria",
};

export const RatesView = () => {
  const { gateways, pagadores, countries, states, exchangeRates, partnerships, refreshExchangeRates, refreshPagadores, refreshGateways } = useAppStore();
  const canWrite = useAuthStore(s => s.hasPermission("tasas", true));

  const [activeTab, setActiveTab]   = useState<Tab>("pagador");
  const [selectedId, setSelectedId] = useState<string>("");
  const [rateInputs, setRateInputs] = useState<Record<string, string>>({});
  const [savedInputs, setSavedInputs] = useState<Record<string, string>>({});
  const [saving, setSaving]         = useState(false);
  const [errorMsg, setErrorMsg]     = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Calculator state
  const [calcPartnership, setCalcPartnership] = useState<string>("");
  const [calcFromId,      setCalcFromId]      = useState<string>("");
  const [calcStateId,     setCalcStateId]     = useState<string>("");
  const [calcToId,        setCalcToId]        = useState<string>("");
  const [calcMethod,      setCalcMethod]      = useState<string>("");
  const [calcSenderMethod,setCalcSenderMethod]= useState<string>("");
  const [calcAmount,      setCalcAmount]      = useState<string>("");
  const [calcDeliveryFlows, setCalcDeliveryFlows] = useState<DeliveryFlow[]>([]);
  const [calcLoading,  setCalcLoading]  = useState(false);
  const [calcError,    setCalcError]    = useState<string | null>(null);
  const [calcResult,   setCalcResult]   = useState<CalculateAmountResult | null>(null);

  const sendCountries    = countries.filter((c) => c.send);
  const receiveCountries = countries.filter((c) => c.receive);
  const calcFromCountry  = countries.find((c) => c.id === calcFromId);
  const calcToCountry    = countries.find((c) => c.id === calcToId);
  const calcFromStates   = states.filter((s) => s.country_id === calcFromId);

  const activePagadores = pagadores.filter((p) => p.status === "active");
  const activeGateways  = gateways.filter((g) => g.status === "active");
  const entities        = activeTab === "pagador" ? activePagadores : activeGateways;

  const selectedEntity =
    activeTab === "pagador"
      ? activePagadores.find((p) => p.id === selectedId)
      : activeGateways.find((g) => g.id === selectedId);

  const entityCountryIds: string[] =
    activeTab === "pagador"
      ? (selectedEntity as any)?.countries ?? []
      : (selectedEntity as any)?.origin_countries ?? [];

  const entityCountries = countries.filter((c) => entityCountryIds.includes(c.id));

  const isDirty = Object.keys(rateInputs).some(
    (k) => rateInputs[k] !== (savedInputs[k] ?? "")
  );

  // Load saved rates when selection changes
  useEffect(() => {
    if (!selectedId) return;
    const saved = exchangeRates.filter(
      (r) => r.entity_type === activeTab && r.entity_id === selectedId
    );
    const map: Record<string, string> = {};
    for (const r of saved) map[r.country_id] = String(r.rate);
    setRateInputs(map);
    setSavedInputs(map);
    setErrorMsg(null);
    setSuccessMsg(null);
  }, [selectedId, activeTab, exchangeRates]);

  // Reset on tab change
  useEffect(() => {
    setSelectedId("");
    setRateInputs({});
    setSavedInputs({});
    setErrorMsg(null);
    setSuccessMsg(null);
  }, [activeTab]);

  // Auto-select first partnership when partnerships load
  useEffect(() => {
    if (partnerships.length > 0 && !calcPartnership) {
      const sorted = [...partnerships].sort((a, b) => a.id - b.id);
      setCalcPartnership(String(sorted[0].id));
    }
  }, [partnerships]);

  // Reset all calc fields when partnership changes (skip on initial auto-select)
  const prevPartnership = useRef<string>("");
  useEffect(() => {
    if (!calcPartnership || prevPartnership.current === "") {
      prevPartnership.current = calcPartnership;
      return;
    }
    if (prevPartnership.current !== calcPartnership) {
      prevPartnership.current = calcPartnership;
      setCalcFromId("");
      setCalcStateId("");
      setCalcToId("");
      setCalcMethod("");
      setCalcSenderMethod("");
      setCalcAmount("");
      setCalcDeliveryFlows([]);
      setCalcResult(null);
      setCalcError(null);
    }
  }, [calcPartnership]);

  // Reset state when origin country changes
  useEffect(() => {
    setCalcStateId("");
  }, [calcFromId]);

  // Load delivery flows when destination country or partnership changes
  useEffect(() => {
    if (!calcToId || !calcPartnership) {
      setCalcDeliveryFlows([]);
      setCalcMethod("");
      return;
    }
    api.getDeliveryFlows(Number(calcPartnership), calcToId)
      .then((flows) => {
        setCalcDeliveryFlows(flows.filter((f) => f.active));
        setCalcMethod("");
      })
      .catch(() => {
        setCalcDeliveryFlows([]);
        setCalcMethod("");
      });
  }, [calcToId, calcPartnership]);

  // Clear result when any calc field changes
  useEffect(() => {
    setCalcResult(null);
    setCalcError(null);
  }, [calcPartnership, calcFromId, calcStateId, calcToId, calcMethod, calcSenderMethod, calcAmount]);

  const handleCalculate = async () => {
    if (!calcPartnership || !calcFromId || !calcToId || !calcMethod || !calcSenderMethod || !calcAmount) return;
    setCalcLoading(true);
    setCalcError(null);
    setCalcResult(null);
    try {
      const result = await api.calculateAmount({
        originCountry:        calcFromId,
        originCity:           calcStateId || null,
        destinationCountry:   calcToId,
        sentAmount:           parseFloat(calcAmount),
        paymentMethod:        calcMethod,
        senderPaymentMethod:  calcSenderMethod,
        timezone:             Intl.DateTimeFormat().resolvedOptions().timeZone,
        completeResponse:     true,
        partnershipId:        Number(calcPartnership),
      });
      setCalcResult(result);
    } catch (e: any) {
      setCalcError(e.message || "Error al calcular.");
    } finally {
      setCalcLoading(false);
    }
  };

  const handleReset = () => {
    setRateInputs(savedInputs);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleSave = async () => {
    if (!selectedId) return;
    const rates: ExchangeRateIn[] = entityCountryIds.map((cid) => ({
      country_id: cid,
      rate: parseFloat(rateInputs[cid] ?? "0") || 0,
    }));
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await api.replaceExchangeRates(activeTab, selectedId, rates);
      await Promise.all([
        refreshExchangeRates(),
        activeTab === "pagador" ? refreshPagadores() : refreshGateways(),
      ]);
      setSuccessMsg("Tasas guardadas.");
      if (successTimer.current) clearTimeout(successTimer.current);
      successTimer.current = setTimeout(() => setSuccessMsg(null), 3000);
    } catch (e: any) {
      setErrorMsg(e.message || "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  // ── Stat pills in header ───────────────────────────────────────────────────
  const totalConfigured = entities.filter((e) => (e as any).rate_status !== "empty").length;

  return (
    <div className="space-y-5">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="bg-white px-5 py-4 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Tasas de Cambio</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Tasa de conversión a USD por país para cada entidad.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => {}}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-papaya-orange text-papaya-orange text-sm font-medium hover:bg-orange-50 transition-colors"
          >
            <Zap size={15} />
            Ejecutar Integraciones
          </button>
          <div className="text-right">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Configurados</p>
            <p className="text-2xl font-bold text-papaya-orange leading-none mt-0.5">
              {totalConfigured}
              <span className="text-sm font-normal text-gray-400 ml-1">/ {entities.length}</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
            <TrendingUp size={20} className="text-papaya-orange" />
          </div>
        </div>
      </div>

      {/* ── Main row: rates card + calculator ────────────────────────────── */}
      <div className="flex gap-4 items-start">

      {/* ── Rates card ───────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

        {/* Tabs */}
        <div className="flex border-b border-gray-100 bg-gray-50/50">
          {(["pagador", "gateway"] as Tab[]).map((tab) => {
            const active = activeTab === tab;
            const list   = tab === "pagador" ? activePagadores : activeGateways;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative px-6 py-3.5 text-sm font-medium transition-all flex items-center gap-2 ${
                  active
                    ? "text-papaya-orange after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-papaya-orange"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {ENTITY_LABEL[tab].plural}
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                    active ? "bg-orange-100 text-papaya-orange" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {list.length}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex" style={{ minHeight: 480 }}>

          {/* ── Entity list ──────────────────────────────────────────────── */}
          <div className="w-60 border-r border-gray-100 flex-shrink-0 overflow-y-auto">
            {entities.length === 0 ? (
              <p className="p-5 text-sm text-gray-400 text-center">
                Sin {ENTITY_LABEL[activeTab].plural.toLowerCase()} activos.
              </p>
            ) : (
              <ul className="py-2">
                {entities.map((entity, idx) => {
                  const color      = getInitialColor(idx);
                  const rateStatus = (entity as any).rate_status as "complete" | "partial" | "empty";
                  const total      = activeTab === "pagador"
                    ? (entity as any).countries?.length ?? 0
                    : (entity as any).origin_countries?.length ?? 0;
                  const isSelected = selectedId === entity.id;
                  return (
                    <li key={entity.id}>
                      <button
                        onClick={() => setSelectedId(entity.id)}
                        className={`w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors ${
                          isSelected
                            ? "bg-orange-50 border-r-2 border-papaya-orange"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        {/* Avatar */}
                        <span
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${color.bg} ${color.text}`}
                        >
                          {entity.name.slice(0, 2).toUpperCase()}
                        </span>

                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${isSelected ? "text-papaya-orange" : "text-gray-800"}`}>
                            {entity.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {rateStatus === "complete"
                              ? `${total} país${total !== 1 ? "es" : ""}`
                              : rateStatus === "partial"
                              ? "Parcial"
                              : `${total} país${total !== 1 ? "es" : ""}`}
                          </p>
                        </div>

                        {/* Status dot */}
                        {rateStatus === "complete" && total > 0 ? (
                          <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                        ) : rateStatus === "partial" ? (
                          <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* ── Right panel ──────────────────────────────────────────────── */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {!selectedId ? (
              <div className="flex-1 flex items-center justify-center text-gray-300">
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center mx-auto">
                    <TrendingUp size={28} className="text-gray-300" />
                  </div>
                  <p className="text-sm text-gray-400">
                    Selecciona un {ENTITY_LABEL[activeTab].singular} para configurar sus tasas
                  </p>
                </div>
              </div>
            ) : entityCountries.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-sm text-gray-400">
                  <strong>{selectedEntity?.name}</strong> no tiene países configurados.
                </p>
              </div>
            ) : (
              <>
                {/* Panel header */}
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-3 bg-gray-50/40">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                        getInitialColor(entities.findIndex((e) => e.id === selectedId)).bg
                      } ${
                        getInitialColor(entities.findIndex((e) => e.id === selectedId)).text
                      }`}
                    >
                      {selectedEntity?.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{selectedEntity?.name}</p>
                      <p className="text-xs text-gray-400">{entityCountries.length} países destino</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isDirty && (
                      <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        Cambios sin guardar
                      </span>
                    )}
                    {successMsg && (
                      <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                        {successMsg}
                      </span>
                    )}
                    {saving && (
                      <span className="text-xs text-gray-400">Guardando...</span>
                    )}
                  </div>
                </div>

                {/* Error */}
                {errorMsg && (
                  <div className="mx-5 mt-4 bg-red-50 border-l-4 border-red-400 p-3 rounded-md flex items-start gap-2">
                    <AlertTriangle size={14} className="text-red-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-red-700">{errorMsg}</p>
                  </div>
                )}

                {/* Country grid */}
                <div className="flex-1 overflow-y-auto p-5">
                  <div className="grid grid-cols-3 gap-3">
                    {entityCountries.map((country) => {
                      const val      = rateInputs[country.id] ?? "";
                      const hasRate  = parseFloat(val) > 0;
                      const fxPct    = activeTab === "pagador"
                        ? ((selectedEntity as any)?.country_fx?.[country.id] ?? null)
                        : null;
                      const payerRate   = parseFloat(val);
                      const papayaRate  = fxPct !== null && payerRate > 0
                        ? payerRate * (1 - fxPct / 100)
                        : null;

                      return (
                        <div
                          key={country.id}
                          className={`rounded-xl border transition-all ${
                            hasRate
                              ? "border-green-200 bg-green-50/40"
                              : "border-gray-100 bg-gray-50/60"
                          }`}
                        >
                          {/* Card header */}
                          <div className="px-3 pt-3 pb-2 flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-gray-800 leading-tight">
                                {country.name}
                              </p>
                              <span className="inline-block mt-0.5 text-[10px] font-semibold tracking-widest text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                {country.currency_code}
                              </span>
                            </div>
                            {hasRate && (
                              <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                            )}
                          </div>

                          {/* Rate input */}
                          <div className="px-3 pb-3 space-y-1.5">
                            <label className="block text-[10px] text-gray-400 uppercase tracking-wide">
                              1 USD =
                            </label>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min="0"
                                step="0.0001"
                                value={val}
                                onChange={(e) =>
                                  setRateInputs((prev) => ({
                                    ...prev,
                                    [country.id]: e.target.value,
                                  }))
                                }
                                placeholder="0.0000"
                                className={`flex-1 min-w-0 text-right rounded-lg border px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 transition-colors ${
                                  hasRate
                                    ? "border-green-200 focus:border-green-400 focus:ring-green-200 bg-white"
                                    : "border-gray-200 focus:border-papaya-orange focus:ring-orange-100 bg-white"
                                }`}
                              />
                              <span className="text-xs font-semibold text-gray-400 flex-shrink-0">
                                {country.currency_code}
                              </span>
                            </div>

                            {/* Papaya rate — only for pagadores with FX configured */}
                            {papayaRate !== null && (
                              <div className="flex items-center justify-between pt-0.5">
                                <span className="text-[10px] text-gray-400 uppercase tracking-wide flex items-center gap-1">
                                  <TrendingUp size={10} className="text-papaya-orange" />
                                  Tasa Papaya
                                </span>
                                <span className="text-[11px] font-semibold text-papaya-orange font-mono">
                                  {papayaRate.toFixed(4)}
                                </span>
                              </div>
                            )}
                            {activeTab === "pagador" && fxPct === null && hasRate && (
                              <p className="text-[10px] text-amber-500 flex items-center gap-1">
                                <AlertTriangle size={10} />
                                Sin FX% — configura el pagador
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Sticky footer */}
                <div className="px-5 py-3 border-t border-gray-100 bg-white flex items-center justify-between">
                  <p className="text-xs text-gray-400">
                    {entityCountries.filter((c) => parseFloat(rateInputs[c.id] ?? "0") > 0).length}
                    {" de "}
                    {entityCountries.length} tasas configuradas
                  </p>
                  {canWrite && (
                    <div className="flex gap-2">
                      {isDirty && (
                        <button
                          onClick={handleReset}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <RotateCcw size={13} />
                          Descartar
                        </button>
                      )}
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg bg-papaya-orange text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
                      >
                        <Save size={13} />
                        Guardar
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Calculator card ──────────────────────────────────────────────── */}
      <div className="w-72 flex-shrink-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden self-stretch flex flex-col">
        <div className="px-4 py-3.5 border-b border-gray-100 flex items-center gap-2">
          <Calculator size={15} className="text-papaya-orange" />
          <h3 className="text-sm font-semibold text-gray-800">Calculadora</h3>
        </div>

        <div className="p-4 flex flex-col gap-4 flex-1">
          {/* Partnership */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
              Alianza
            </label>
            <select
              value={calcPartnership}
              onChange={(e) => setCalcPartnership(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-papaya-orange focus:ring-1 focus:ring-orange-100 focus:outline-none bg-white"
            >
              <option value="">Seleccionar alianza...</option>
              {[...partnerships].sort((a, b) => a.id - b.id).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Origin — country */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
              ¿Desde dónde envías?
            </label>
            <select
              value={calcFromId}
              onChange={(e) => { setCalcFromId(e.target.value); setCalcAmount(""); }}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-papaya-orange focus:ring-1 focus:ring-orange-100 focus:outline-none bg-white"
            >
              <option value="">País origen...</option>
              {sendCountries.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.currency_code})</option>
              ))}
            </select>
          </div>

          {/* Origin — state (only if country has states in DB) */}
          {calcFromId && calcFromStates.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                Estado / Provincia
              </label>
              <select
                value={calcStateId}
                onChange={(e) => setCalcStateId(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-papaya-orange focus:ring-1 focus:ring-orange-100 focus:outline-none bg-white"
              >
                <option value="">Seleccionar estado...</option>
                {calcFromStates.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}


          {/* Destination */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
              ¿A dónde envías?
            </label>
            <select
              value={calcToId}
              onChange={(e) => setCalcToId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-papaya-orange focus:ring-1 focus:ring-orange-100 focus:outline-none bg-white"
            >
              <option value="">País destino...</option>
              {receiveCountries.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.currency_code})</option>
              ))}
            </select>
          </div>

          {/* Receiver payment method */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
              ¿Cómo recibe el beneficiario?
            </label>
            <select
              value={calcMethod}
              onChange={(e) => setCalcMethod(e.target.value)}
              disabled={!calcToId || !calcPartnership}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-papaya-orange focus:ring-1 focus:ring-orange-100 focus:outline-none bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">
                {!calcToId || !calcPartnership
                  ? "Selecciona alianza y país destino..."
                  : calcDeliveryFlows.length === 0
                  ? "Sin métodos configurados"
                  : "Método de entrega..."}
              </option>
              {calcDeliveryFlows.map((f) => (
                <option key={f.method} value={f.method}>
                  {DELIVERY_METHOD_LABEL[f.method]}
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
              Monto a enviar{calcFromCountry ? ` (${calcFromCountry.currency_code})` : ""}
            </label>
            <div className="relative">
              {calcFromCountry && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400 pointer-events-none">
                  {calcFromCountry.currency_code}
                </span>
              )}
              <input
                type="number"
                min="0"
                step="0.01"
                value={calcAmount}
                onChange={(e) => setCalcAmount(e.target.value)}
                placeholder="0.00"
                className={`w-full rounded-lg border border-gray-200 py-2 pr-3 text-sm text-right font-mono focus:border-papaya-orange focus:ring-1 focus:ring-orange-100 focus:outline-none ${
                  calcFromCountry ? "pl-14" : "pl-3"
                }`}
              />
            </div>
          </div>

          {/* Sender payment method */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
              ¿Cómo paga el remitente?
            </label>
            <select
              value={calcSenderMethod}
              onChange={(e) => setCalcSenderMethod(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-papaya-orange focus:ring-1 focus:ring-orange-100 focus:outline-none bg-white"
            >
              <option value="">Método de pago...</option>
              <option value="creditCard">Tarjeta de Crédito</option>
              <option value="debitCard">Tarjeta de Débito</option>
              <option value="applePay">Apple Pay</option>
              <option value="googlePay">Google Pay</option>
            </select>
          </div>

          {/* Calculate button */}
          <button
            onClick={handleCalculate}
            disabled={calcLoading || !calcPartnership || !calcFromId || !calcToId || !calcMethod || !calcSenderMethod || !calcAmount}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-papaya-orange text-white text-sm font-medium hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {calcLoading
              ? <><Loader2 size={14} className="animate-spin" /> Calculando...</>
              : <><Calculator size={14} /> Calcular</>}
          </button>

          {/* Result */}
          <div className={`mt-auto rounded-xl border p-4 transition-all ${
            calcResult ? "border-orange-100 bg-orange-50/60"
            : calcError  ? "border-transparent bg-transparent p-0"
            : "border-gray-100 bg-gray-50/60"
          }`}>
            {calcError ? (
              <CalcErrorCard message={calcError} />
            ) : calcResult ? (
              (() => {
                const payerName    = pagadores.find((p) => p.id === calcResult.payerId)?.name    ?? calcResult.payerId;
                const collectorName = gateways.find((g) => g.id === calcResult.collectorId)?.name ?? calcResult.collectorId;
                const fmt = (n: number) => n.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
                const Row = ({ label, value, mono = true, highlight = false }: { label: string; value: string; mono?: boolean; highlight?: boolean }) => (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-500 shrink-0">{label}</span>
                    <span className={`text-xs text-right truncate ${mono ? "font-mono" : ""} ${highlight ? "font-bold text-papaya-orange" : "text-gray-700"}`}>
                      {value}
                    </span>
                  </div>
                );
                return (
                  <div className="space-y-1.5">
                    {/* Collector */}
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Recolector</p>
                    <Row label="Nombre"       value={collectorName} mono={false} />
                    <Row label="Tasa"         value={`1 USD = ${fmt(calcResult.collectorRate)} ${calcFromCountry?.currency_code}`} />
                    <Row label="Monto en USD" value={`${fmt(calcResult.amountInUsdCollector)} USD`} />

                    <div className="border-t border-orange-100 my-2" />

                    {/* Papaya FX */}
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Tasa Papaya</p>
                    <Row label="Tasa pagador" value={`${fmt(calcResult.payerRate)} ${calcToCountry?.currency_code}`} />
                    <Row label="Margen FX"    value={`${calcResult.fxPercentage.toFixed(2)}%`} />
                    <Row label="Tasa aplicada" value={`${fmt(calcResult.papayaRate)} ${calcToCountry?.currency_code}`} />

                    <div className="border-t border-orange-100 my-2" />

                    {/* Payer */}
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Pagador</p>
                    <Row label="Nombre" value={payerName} mono={false} />

                    <div className="border-t border-orange-100 my-2" />

                    {/* Result */}
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Resultado</p>
                    {(() => {
                      const isVECash = calcToId === "VE" && calcMethod === "cash_pickup";
                      const receiveCurrency = isVECash ? "USD" : calcToCountry?.currency_code;
                      return (
                        <Row label={`Recibe (${receiveCurrency})`} value={`${fmt(calcResult.amountToDeliver)} ${receiveCurrency}`} highlight />
                      );
                    })()}
                    <Row
                      label={calcResult.feeType === "percentage" ? `Comisión (${calcResult.papayaFee.toFixed(2)}%)` : "Comisión (fija)"}
                      value={`${fmt(calcResult.papayaFeeLocal)} ${calcFromCountry?.currency_code}`}
                    />
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-orange-200">
                      <span className="text-xs font-semibold text-gray-700">Total a pagar</span>
                      <span className="text-sm font-bold font-mono text-gray-800">
                        {fmt(calcResult.amountToPay)} {calcFromCountry?.currency_code}
                      </span>
                    </div>
                  </div>
                );
              })()
            ) : (
              <p className="text-xs text-gray-400 text-center py-2">
                Completa los campos y presiona Calcular
              </p>
            )}
          </div>
        </div>
      </div>

      </div>{/* end main row */}
    </div>
  );
};
