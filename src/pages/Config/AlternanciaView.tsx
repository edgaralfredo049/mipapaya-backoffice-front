import React, { useState, useEffect } from "react";
import { useAppStore } from "../../store/useAppStore";
import { api, AlternanciaSlot, AlternanciaSlotIn } from "../../api";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Plus, Trash2, AlertTriangle, Clock, AlertCircle } from "lucide-react";
import { PAGADOR_COLORS } from "../../data/constants";
import { Handshake } from "lucide-react";

const ALL_PAYMENT_METHODS = ["bank_deposit", "cash_pickup", "mobile_money", "wallet"] as const;

const PM_LABEL: Record<string, string> = {
  bank_deposit: "Depósito Bancario",
  cash_pickup: "Retiro en Efectivo",
  mobile_money: "Dinero Móvil",
  wallet: "Billetera Digital",
};

// 0=Dom, 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb  (matches strftime('%w') and getDay())
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6] as const;
const DAY_LABEL: Record<number, string> = {
  0: "Dom", 1: "Lun", 2: "Mar", 3: "Mié", 4: "Jue", 5: "Vie", 6: "Sáb",
};

const getColorForPagador = (pagadorId: string, pagadores: any[]) => {
  const idx = pagadores.findIndex((p) => p.id === pagadorId);
  return PAGADOR_COLORS[idx % PAGADOR_COLORS.length] || PAGADOR_COLORS[0];
};

const formatHour = (h: number) => `${String(h % 24).padStart(2, "0")}:00`;
const formatUSD = (n: number) => `$${Math.round(n)}`;

const hasOverlap = (
  slots: AlternanciaSlot[],
  candidate: AlternanciaSlot,
  excludeId?: string
): boolean => {
  const sameCountry = slots.filter(
    (s) =>
      s.country_id === candidate.country_id &&
      s.id !== excludeId &&
      s.partnership_id === candidate.partnership_id
  );
  const cTs = candidate.hour_start;
  const cTe = candidate.hour_end > candidate.hour_start ? candidate.hour_end : candidate.hour_end + 24;
  for (const s of sameCountry) {
    const sTs = s.hour_start;
    const sTe = s.hour_end > s.hour_start ? s.hour_end : s.hour_end + 24;
    // Time overlap?
    if (cTs >= sTe || sTs >= cTe) continue;
    // USD range overlap?
    if (candidate.amount_min > s.amount_max || s.amount_min > candidate.amount_max) continue;
    // Payment method overlap?
    const commonPm = candidate.payment_methods.filter((pm) => s.payment_methods.includes(pm));
    if (commonPm.length === 0) continue;
    // Day of week overlap?
    const commonDow = candidate.days_of_week.filter((d) => s.days_of_week.includes(d));
    if (commonDow.length > 0) return true;
  }
  return false;
};

const defaultForm = () => ({
  country_id: "",
  pagador_id: "",
  partnership_id: 1 as number,
  hour_start: -1,
  hour_end: -1,
  amount_min: 20,
  amount_max: 500,
  payment_methods: [] as string[],
  days_of_week: [0, 1, 2, 3, 4, 5, 6] as number[],
});

export const AlternanciaView = () => {
  const { alternancia, pagadores, countries, partnerships, refreshAlternancia } = useAppStore();
  const [slots, setSlots] = useState<AlternanciaSlot[]>([]);
  const [selectedPartnershipId, setSelectedPartnershipId] = useState<number | null>(null);
  const [selectedCountryId, setSelectedCountryId] = useState<string>("");
  const [timelineDay, setTimelineDay] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<AlternanciaSlot | null>(null);
  const [form, setForm] = useState(defaultForm());
  const [saving, setSaving] = useState(false);

  const activePagadores = pagadores.filter((p) => p.status === "active");

  const availableCountryIds = Array.from(
    new Set(activePagadores.flatMap((p) => p.countries || []))
  ).sort();

  const getCountryName = (id: string) => countries.find((c) => c.id === id)?.name || id;

  useEffect(() => { setSlots(alternancia); }, [alternancia]);

  useEffect(() => {
    if (availableCountryIds.length > 0 && !selectedCountryId) {
      setSelectedCountryId(availableCountryIds[0]);
    }
  }, [availableCountryIds, selectedCountryId]);

  const partnershipSlots = slots.filter(
    (s) => s.partnership_id === selectedPartnershipId
  );

  // Auto-select first partnership on load
  useEffect(() => {
    if (partnerships.length > 0 && selectedPartnershipId === null) {
      setSelectedPartnershipId(partnerships[0].id);
    }
  }, [partnerships]);

  const filteredSlots = partnershipSlots
    .filter((s) => s.country_id === selectedCountryId)
    .sort((a, b) => a.hour_start - b.hour_start || a.amount_min - b.amount_min);

  const openAddModal = () => {
    setEditingSlot(null);
    setForm({ ...defaultForm(), country_id: selectedCountryId, partnership_id: selectedPartnershipId ?? 1 });
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const openEditModal = (slot: AlternanciaSlot) => {
    setEditingSlot(slot);
    setForm({
      country_id:     slot.country_id,
      pagador_id:     slot.pagador_id,
      partnership_id: slot.partnership_id,
      hour_start:     slot.hour_start,
      hour_end:       slot.hour_end,
      amount_min:     slot.amount_min,
      amount_max:     slot.amount_max,
      payment_methods: [...slot.payment_methods],
      days_of_week:    [...(slot.days_of_week ?? [0,1,2,3,4,5,6])],
    });
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const persist = async (updated: AlternanciaSlot[]) => {
    setSaving(true);
    try {
      const payload: AlternanciaSlotIn[] = updated.map(
        ({ country_id, pagador_id, partnership_id, hour_start, hour_end, amount_min, amount_max, payment_methods, days_of_week, active }) => ({
          country_id, pagador_id, partnership_id, hour_start, hour_end, amount_min, amount_max, payment_methods, days_of_week, active,
        })
      );
      await api.replaceAlternancia(payload);
      await refreshAlternancia();
      setErrorMsg(null);
    } catch (e: any) {
      setErrorMsg(e.message || "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSlot = async () => {
    if (!form.partnership_id) {
      setErrorMsg("La alianza es obligatoria.");
      return;
    }
    if (!form.country_id || !form.pagador_id || form.hour_start === -1 || form.hour_end === -1) {
      setErrorMsg("País, pagador y horario son obligatorios.");
      return;
    }
    if (form.days_of_week.length === 0) {
      setErrorMsg("Selecciona al menos un día de la semana.");
      return;
    }
    if (form.hour_start === form.hour_end) {
      setErrorMsg("La hora de inicio y fin no pueden ser iguales.");
      return;
    }
    if (form.amount_min >= form.amount_max) {
      setErrorMsg("El monto mínimo debe ser menor al máximo.");
      return;
    }
    if (form.payment_methods.length === 0) {
      setErrorMsg("Selecciona al menos un método de pago.");
      return;
    }
    const candidate: AlternanciaSlot = {
      id:             editingSlot?.id || `tmp-${Date.now()}`,
      country_id:     form.country_id,
      pagador_id:     form.pagador_id,
      partnership_id: form.partnership_id,
      hour_start:     form.hour_start,
      hour_end:       form.hour_end,
      amount_min:     form.amount_min,
      amount_max:     form.amount_max,
      payment_methods: form.payment_methods,
      days_of_week:    form.days_of_week,
      active: true,
    };
    if (hasOverlap(slots, candidate, editingSlot?.id)) {
      setErrorMsg(
        "Este segmento se superpone con otro (mismo horario, rango USD y método de pago)."
      );
      return;
    }
    const updated = editingSlot
      ? slots.map((s) => (s.id === editingSlot.id ? candidate : s))
      : [...slots, candidate];
    setIsModalOpen(false);
    setErrorMsg(null);
    await persist(updated);
  };

  const handleDeleteSlot = async (id: string) => {
    const updated = slots.filter((s) => s.id !== id);
    await persist(updated);
  };

  const togglePaymentMethod = (pm: string) => {
    setForm((f) => ({
      ...f,
      payment_methods: f.payment_methods.includes(pm)
        ? f.payment_methods.filter((m) => m !== pm)
        : [...f.payment_methods, pm],
    }));
  };

  const toggleDay = (day: number) => {
    setForm((f) => ({
      ...f,
      days_of_week: f.days_of_week.includes(day)
        ? f.days_of_week.filter((d) => d !== day)
        : [...f.days_of_week, day].sort((a, b) => a - b),
    }));
  };

  const uncoveredHours = Array.from({ length: 24 }, (_, h) => h).filter(
    (h) =>
      !filteredSlots.some((s) => {
        if (s.hour_end > s.hour_start) return h >= s.hour_start && h < s.hour_end;
        return h >= s.hour_start || h < s.hour_end;
      })
  );

  const renderTimeline = () => {
    if (filteredSlots.length === 0) return null;
    const timelineSlots = timelineDay === null
      ? filteredSlots
      : filteredSlots.filter((s) => s.days_of_week.includes(timelineDay));
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Clock size={16} className="text-gray-400" />
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Timeline 24h — {getCountryName(selectedCountryId)}
            </p>
          </div>
          {/* Day filter */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setTimelineDay(null)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                timelineDay === null
                  ? "bg-gray-800 text-white border-gray-800"
                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
              }`}
            >
              Todos
            </button>
            {ALL_DAYS.map((day) => (
              <button
                key={day}
                onClick={() => setTimelineDay(timelineDay === day ? null : day)}
                className={`px-2 py-1 rounded-lg text-xs font-medium border transition-all ${
                  timelineDay === day
                    ? "bg-papaya-orange text-white border-papaya-orange"
                    : "bg-white text-gray-500 border-gray-200 hover:border-papaya-orange hover:text-papaya-orange"
                }`}
              >
                {DAY_LABEL[day]}
              </button>
            ))}
          </div>
        </div>

        {timelineSlots.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">
            Sin franjas operativas el {DAY_LABEL[timelineDay!]}
          </p>
        ) : (
        <div className="space-y-2">
          {timelineSlots.map((slot) => {
            const pagador = activePagadores.find((p) => p.id === slot.pagador_id);
            const color = getColorForPagador(slot.pagador_id, activePagadores);
            const hStart = slot.hour_start;
            const hEnd = slot.hour_end > slot.hour_start ? slot.hour_end : slot.hour_end + 24;
            const leftPct = (hStart / 24) * 100;
            const widthPct = Math.min(((hEnd - hStart) / 24) * 100, 100 - leftPct);
            const pmLabel = slot.payment_methods.map((pm) => PM_LABEL[pm] ?? pm).join(" · ");
            const dowLabel = slot.days_of_week.length === 7
              ? "Todos los días"
              : slot.days_of_week.map((d) => DAY_LABEL[d]).join(" · ");

            return (
              <div key={slot.id} className="flex items-center gap-3 pr-2">
                <span className="w-32 text-xs text-gray-600 text-right truncate shrink-0">
                  {pagador?.name || slot.pagador_id}
                </span>
                <div className="relative flex-1 h-12 bg-gray-100 rounded-lg overflow-hidden">
                  <div
                    className={`absolute inset-y-0 ${color.bg} flex flex-col items-center justify-center overflow-hidden rounded`}
                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                    title={`${formatHour(slot.hour_start)}–${formatHour(slot.hour_end)} | ${formatUSD(slot.amount_min)}–${formatUSD(slot.amount_max)} | ${pmLabel} | ${dowLabel}`}
                  >
                    <span className={`text-[10px] font-bold ${color.text} leading-none px-1`}>
                      {formatUSD(slot.amount_min)}–{formatUSD(slot.amount_max)}
                    </span>
                    <span className={`text-[9px] ${color.text} opacity-80 leading-none mt-0.5 px-1 truncate max-w-full`}>
                      {pmLabel}
                    </span>
                    <span className={`text-[9px] ${color.text} opacity-60 leading-none mt-0.5 px-1 truncate max-w-full`}>
                      {dowLabel}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        )}

        {/* Hour labels */}
        <div className="flex mt-1.5 ml-[152px] pr-2">
          <div className="relative flex-1 h-4">
            {[0, 6, 12, 18, 24].map((h) => (
              <span
                key={h}
                className="absolute text-[10px] text-gray-400 -translate-x-1/2"
                style={{ left: `${(h / 24) * 100}%` }}
              >
                {formatHour(h % 24)}
              </span>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-gray-100">
          {activePagadores.map((p) => {
            if (!filteredSlots.some((s) => s.pagador_id === p.id)) return null;
            const color = getColorForPagador(p.id, activePagadores);
            return (
              <div key={p.id} className="flex items-center space-x-1.5">
                <div className={`w-3 h-3 rounded-full ${color.bg}`} />
                <span className="text-xs text-gray-600">{p.name}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Alternancia por País</h2>
          <p className="text-sm text-gray-500">
            Define qué pagador atiende cada franja horaria, rango de monto y método de pago por país destino.
          </p>
        </div>
        {saving && <span className="text-sm text-gray-500">Guardando...</span>}
      </div>

      {errorMsg && !isModalOpen && (
        <div className="bg-red-50 border-l-4 border-red-400 p-3 rounded-md flex items-start space-x-2">
          <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700">{errorMsg}</p>
        </div>
      )}

      {/* Partnership filter */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Handshake size={14} className="text-gray-400" />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Alianza</span>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {[...partnerships].sort((a, b) => a.id - b.id).map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPartnershipId(p.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                selectedPartnershipId === p.id
                  ? "bg-papaya-orange text-white border-papaya-orange shadow-sm"
                  : "bg-white text-gray-600 border-gray-200 hover:border-papaya-orange hover:text-papaya-orange"
              }`}
            >
              {p.name}
              <span className="ml-1.5 text-xs opacity-70">
                ({slots.filter((s) => s.partnership_id === p.id).length})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Country filter */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {availableCountryIds.map((cid) => (
            <button
              key={cid}
              onClick={() => setSelectedCountryId(cid)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                selectedCountryId === cid
                  ? "bg-papaya-orange text-white border-papaya-orange shadow-sm"
                  : "bg-white text-gray-600 border-gray-200 hover:border-papaya-orange hover:text-papaya-orange"
              }`}
            >
              {getCountryName(cid)}
              <span className="ml-1.5 text-xs opacity-70">
                ({partnershipSlots.filter((s) => s.country_id === cid).length})
              </span>
            </button>
          ))}
          {availableCountryIds.length === 0 && (
            <p className="text-sm text-gray-400">
              No hay países disponibles. Configura pagadores con países destino primero.
            </p>
          )}
        </div>
      </div>

      {selectedCountryId && (
        <>
          {uncoveredHours.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-3">
              <AlertCircle size={16} className="text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  {uncoveredHours.length} hora{uncoveredHours.length > 1 ? "s" : ""} sin cobertura en{" "}
                  {getCountryName(selectedCountryId)}
                </p>
                <p className="text-xs text-amber-600 mt-0.5">
                  Las transacciones en esos horarios fallarán.{" "}
                  {uncoveredHours.length <= 6 &&
                    uncoveredHours.map((h) => `${String(h).padStart(2, "0")}:00`).join(", ")}
                </p>
              </div>
            </div>
          )}
          {renderTimeline()}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-700">
                Franjas configuradas —{" "}
                <span className="text-papaya-orange">{getCountryName(selectedCountryId)}</span>
              </p>
              <Button variant="outline" size="sm" onClick={openAddModal} className="flex items-center">
                <Plus size={14} className="mr-1" /> Agregar franja
              </Button>
            </div>

            {filteredSlots.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <Clock size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Sin franjas configuradas para {getCountryName(selectedCountryId)}</p>
                <p className="text-xs mt-1">Haz clic en "Agregar franja" para empezar</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filteredSlots.map((slot) => {
                  const pagador = activePagadores.find((p) => p.id === slot.pagador_id);
                  const color = getColorForPagador(slot.pagador_id, activePagadores);
                  return (
                    <div
                      key={slot.id}
                      className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-10 rounded-full ${color.bg}`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900">
                              {pagador?.name || slot.pagador_id}
                            </p>
                            {slot.partnership_id && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-orange-50 text-papaya-orange border border-orange-100">
                                <Handshake size={9} />
                                {partnerships.find((p) => p.id === slot.partnership_id)?.name ?? slot.partnership_id}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">
                            {formatHour(slot.hour_start)} – {formatHour(slot.hour_end)}
                            {slot.hour_end < slot.hour_start && " (+1 día)"}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {slot.days_of_week.length === 7
                              ? "Todos los días"
                              : slot.days_of_week.map((d) => DAY_LABEL[d]).join(" · ")}
                          </p>
                        </div>
                        <div className="flex flex-col gap-0.5 ml-2">
                          <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">
                            {formatUSD(slot.amount_min)} – {formatUSD(slot.amount_max)}
                          </span>
                          <span className="text-[10px] text-gray-500 px-2">
                            {slot.payment_methods.map((pm) => PM_LABEL[pm] ?? pm).join(" · ")}
                          </span>
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <Button variant="ghost" size="sm" onClick={() => openEditModal(slot)}>
                          <span className="text-xs text-blue-500">Editar</span>
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteSlot(slot.id)}>
                          <Trash2 size={14} className="text-red-400" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSlot ? "Editar Franja" : "Nueva Franja"}
      >
        <div className="space-y-4">
          {errorMsg && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded-md flex items-start space-x-2">
              <AlertTriangle size={16} className="text-yellow-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-yellow-700">{errorMsg}</p>
            </div>
          )}

          {/* Alianza */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Alianza</label>
            <select
              value={form.partnership_id}
              onChange={(e) => setForm({ ...form, partnership_id: Number(e.target.value) })}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-papaya-orange focus:ring-papaya-orange"
            >
              {partnerships.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* País */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">País Destino</label>
            <select
              value={form.country_id}
              onChange={(e) => setForm({ ...form, country_id: e.target.value })}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-papaya-orange focus:ring-papaya-orange"
            >
              <option value="">Seleccionar país...</option>
              {availableCountryIds.map((cid) => (
                <option key={cid} value={cid}>{getCountryName(cid)}</option>
              ))}
            </select>
          </div>

          {/* Pagador */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pagador</label>
            <select
              value={form.pagador_id}
              onChange={(e) => setForm({ ...form, pagador_id: e.target.value })}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-papaya-orange focus:ring-papaya-orange"
            >
              <option value="">Seleccionar pagador...</option>
              {activePagadores
                .filter((p) => !form.country_id || (p.countries || []).includes(form.country_id))
                .map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
            </select>
            {form.country_id &&
              activePagadores.filter((p) => (p.countries || []).includes(form.country_id)).length === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  ⚠ No hay pagadores activos que operen en {getCountryName(form.country_id)}
                </p>
              )}
          </div>

          {/* Horario */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hora Inicio</label>
              <select
                value={form.hour_start}
                onChange={(e) => setForm({ ...form, hour_start: parseInt(e.target.value) })}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-papaya-orange focus:ring-papaya-orange"
              >
                <option value={-1}>Seleccionar...</option>
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{formatHour(i)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hora Fin</label>
              <select
                value={form.hour_end}
                onChange={(e) => setForm({ ...form, hour_end: parseInt(e.target.value) })}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-papaya-orange focus:ring-papaya-orange"
              >
                <option value={-1}>Seleccionar...</option>
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{formatHour(i)}</option>
                ))}
                <option value={24}>00:00 (medianoche)</option>
              </select>
              {form.hour_end !== -1 && form.hour_start !== -1 && form.hour_end < form.hour_start && (
                <p className="text-xs text-amber-600 mt-1">⚠ Franja cruza medianoche</p>
              )}
            </div>
          </div>

          {/* Rango USD */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rango de monto (USD)</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Desde</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={form.amount_min}
                    onChange={(e) => setForm({ ...form, amount_min: parseFloat(e.target.value) || 0 })}
                    className="block w-full rounded-md border border-gray-300 pl-7 pr-3 py-2 text-sm focus:border-papaya-orange focus:ring-papaya-orange"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Hasta</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={form.amount_max}
                    onChange={(e) => setForm({ ...form, amount_max: parseFloat(e.target.value) || 0 })}
                    className="block w-full rounded-md border border-gray-300 pl-7 pr-3 py-2 text-sm focus:border-papaya-orange focus:ring-papaya-orange"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Métodos de pago */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Métodos de pago</label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_PAYMENT_METHODS.map((pm) => (
                <label
                  key={pm}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                    form.payment_methods.includes(pm)
                      ? "border-papaya-orange bg-orange-50 text-papaya-orange"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={form.payment_methods.includes(pm)}
                    onChange={() => togglePaymentMethod(pm)}
                    className="sr-only"
                  />
                  <span
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      form.payment_methods.includes(pm)
                        ? "bg-papaya-orange border-papaya-orange"
                        : "border-gray-300"
                    }`}
                  >
                    {form.payment_methods.includes(pm) && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8">
                        <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span className="text-sm">{PM_LABEL[pm]}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Días de la semana */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Días operativos</label>
              <button
                type="button"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    days_of_week: f.days_of_week.length === 7 ? [] : [0,1,2,3,4,5,6],
                  }))
                }
                className="text-xs text-papaya-orange hover:underline"
              >
                {form.days_of_week.length === 7 ? "Desmarcar todos" : "Seleccionar todos"}
              </button>
            </div>
            <div className="flex gap-1.5">
              {ALL_DAYS.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${
                    form.days_of_week.includes(day)
                      ? "border-papaya-orange bg-orange-50 text-papaya-orange"
                      : "border-gray-200 text-gray-400 hover:border-gray-300"
                  }`}
                >
                  {DAY_LABEL[day]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveSlot}>Guardar Franja</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
