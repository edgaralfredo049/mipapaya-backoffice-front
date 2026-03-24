import React, { useState, useEffect } from "react";
import { useAppStore } from "../../store/useAppStore";
import { api, GatewayAlternanciaSlot, GatewayAlternanciaSlotIn } from "../../api";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Plus, Trash2, AlertTriangle, DollarSign, AlertCircle } from "lucide-react";
import { PAGADOR_COLORS } from "../../data/constants";

const AMOUNT_MIN = 20;
const AMOUNT_MAX = 500;

const formatUSD = (n: number) => `$${Math.round(n)}`;

const getColorForGateway = (gatewayId: string, gateways: { id: string }[]) => {
  const idx = gateways.findIndex((g) => g.id === gatewayId);
  return PAGADOR_COLORS[idx % PAGADOR_COLORS.length] ?? PAGADOR_COLORS[0];
};

const defaultForm = (): GatewayAlternanciaSlotIn => ({
  gateway_id: "",
  amount_min: 20,
  amount_max: 500,
  active: true,
});

export const GatewayAlternanciaView = () => {
  const { gateways, gatewayAlternancia, refreshGatewayAlternancia } = useAppStore();
  const [slots, setSlots] = useState<GatewayAlternanciaSlot[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<GatewayAlternanciaSlot | null>(null);
  const [form, setForm] = useState<GatewayAlternanciaSlotIn>(defaultForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => { setSlots(gatewayAlternancia); }, [gatewayAlternancia]);

  const activeGateways = gateways.filter((g) => g.status === "active");
  const getGatewayName = (id: string) => gateways.find((g) => g.id === id)?.name ?? id;

  // Gateways that have at least one slot
  const gatewaysWithSlots = activeGateways.filter((g) =>
    slots.some((s) => s.gateway_id === g.id)
  );

  // Uncovered amount ranges across all active slots
  const coveredRanges = slots
    .filter((s) => s.active)
    .map((s) => ({ min: s.amount_min, max: s.amount_max }))
    .sort((a, b) => a.min - b.min);

  const uncoveredRanges: { min: number; max: number }[] = [];
  let cursor = AMOUNT_MIN;
  for (const r of coveredRanges) {
    if (r.min > cursor) uncoveredRanges.push({ min: cursor, max: r.min });
    cursor = Math.max(cursor, r.max);
  }
  if (cursor < AMOUNT_MAX) uncoveredRanges.push({ min: cursor, max: AMOUNT_MAX });

  const hasOverlap = (candidate: GatewayAlternanciaSlotIn, excludeId?: string): boolean =>
    slots.some((s) => {
      if (s.id === excludeId) return false;
      if (s.gateway_id !== candidate.gateway_id) return false;
      return candidate.amount_min < s.amount_max && s.amount_min < candidate.amount_max;
    });

  const openAdd = () => {
    setEditingSlot(null);
    setForm(defaultForm());
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const openEdit = (slot: GatewayAlternanciaSlot) => {
    setEditingSlot(slot);
    setForm({ gateway_id: slot.gateway_id, amount_min: slot.amount_min, amount_max: slot.amount_max, active: slot.active });
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const persist = async (updated: GatewayAlternanciaSlot[]) => {
    setSaving(true);
    try {
      const payload: GatewayAlternanciaSlotIn[] = updated.map(
        ({ gateway_id, amount_min, amount_max, active }) => ({ gateway_id, amount_min, amount_max, active })
      );
      await api.replaceGatewayAlternancia(payload);
      await refreshGatewayAlternancia();
      setErrorMsg(null);
    } catch (e: any) {
      setErrorMsg(e.message ?? "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!form.gateway_id) { setErrorMsg("Selecciona un recolector."); return; }
    if (form.amount_min >= form.amount_max) { setErrorMsg("El monto mínimo debe ser menor que el máximo."); return; }
    if (hasOverlap(form, editingSlot?.id)) {
      setErrorMsg("El rango se superpone con otro slot del mismo recolector.");
      return;
    }
    const updated = editingSlot
      ? slots.map((s) => s.id === editingSlot.id ? { ...s, ...form } : s)
      : [...slots, { id: crypto.randomUUID(), ...form }];
    setIsModalOpen(false);
    setErrorMsg(null);
    await persist(updated);
  };

  const handleDelete = async (slotId: string) => {
    await persist(slots.filter((s) => s.id !== slotId));
  };

  const renderChart = () => {
    if (slots.length === 0) return null;
    const range = AMOUNT_MAX - AMOUNT_MIN;

    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign size={16} className="text-gray-400" />
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Cobertura por Rango USD — Todos los recolectores
          </p>
        </div>

        <div className="space-y-2">
          {gatewaysWithSlots.map((gw) => {
            const color = getColorForGateway(gw.id, activeGateways);
            const gwSlots = slots.filter((s) => s.gateway_id === gw.id && s.active).sort((a, b) => a.amount_min - b.amount_min);
            return (
              <div key={gw.id} className="flex items-center gap-3 pr-2">
                <span className="w-28 text-xs text-gray-600 text-right truncate shrink-0">
                  {gw.name}
                </span>
                <div className="relative flex-1 h-10 bg-gray-100 rounded-lg overflow-hidden">
                  {gwSlots.map((slot) => {
                    const leftPct = ((slot.amount_min - AMOUNT_MIN) / range) * 100;
                    const widthPct = ((slot.amount_max - slot.amount_min) / range) * 100;
                    return (
                      <div
                        key={slot.id}
                        className={`absolute inset-y-0 ${color.bg} flex items-center justify-center overflow-hidden rounded cursor-pointer hover:opacity-80 transition-opacity`}
                        style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                        title={`${gw.name}: ${formatUSD(slot.amount_min)}–${formatUSD(slot.amount_max)}`}
                        onClick={() => openEdit(slot)}
                      >
                        <span className={`text-[10px] font-bold ${color.text} px-1 leading-none truncate`}>
                          {formatUSD(slot.amount_min)}–{formatUSD(slot.amount_max)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Amount axis labels */}
        <div className="flex mt-1.5 ml-[140px] pr-2">
          <div className="relative flex-1 h-4">
            {[20, 100, 200, 300, 400, 500].map((v) => (
              <span
                key={v}
                className="absolute text-[10px] text-gray-400 -translate-x-1/2"
                style={{ left: `${((v - AMOUNT_MIN) / (AMOUNT_MAX - AMOUNT_MIN)) * 100}%` }}
              >
                {formatUSD(v)}
              </span>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-gray-100">
          {gatewaysWithSlots.map((gw) => {
            const color = getColorForGateway(gw.id, activeGateways);
            return (
              <div key={gw.id} className="flex items-center space-x-1.5">
                <div className={`w-3 h-3 rounded-full ${color.bg}`} />
                <span className="text-xs text-gray-600">{gw.name}</span>
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
          <h2 className="text-lg font-semibold text-gray-900">Alternancia de Recolectores</h2>
          <p className="text-sm text-gray-500">
            Define qué recolector atiende cada rango de monto (USD). Si el monto coincide, ese recolector tiene prioridad sobre el routing geográfico.
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

      {/* Uncovered ranges warning */}
      {slots.length > 0 && uncoveredRanges.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-3">
          <AlertCircle size={16} className="text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              {uncoveredRanges.length} rango{uncoveredRanges.length > 1 ? "s" : ""} sin cobertura
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Los montos en {uncoveredRanges.map((r) => `${formatUSD(r.min)}–${formatUSD(r.max)}`).join(", ")} no tienen recolector asignado y fallarán.
            </p>
          </div>
        </div>
      )}

      {renderChart()}

      {/* Slot list */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-700">Slots configurados</p>
          <Button variant="outline" size="sm" onClick={openAdd} className="flex items-center">
            <Plus size={14} className="mr-1" /> Agregar slot
          </Button>
        </div>

        {slots.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <DollarSign size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Sin slots configurados</p>
            <p className="text-xs mt-1">Sin alternancia, se usa el routing geográfico para todos los montos</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {[...slots].sort((a, b) => a.amount_min - b.amount_min).map((slot) => {
              const color = getColorForGateway(slot.gateway_id, activeGateways);
              return (
                <div
                  key={slot.id}
                  className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-10 rounded-full ${color.bg}`} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{getGatewayName(slot.gateway_id)}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${color.light} ${color.text.replace("text-white", "text-gray-700")}`}>
                          {formatUSD(slot.amount_min)} – {formatUSD(slot.amount_max)}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${slot.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {slot.active ? "Activo" : "Inactivo"}
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(slot)}>
                      <span className="text-xs text-blue-500">Editar</span>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(slot.id)}>
                      <Trash2 size={14} className="text-red-400" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingSlot ? "Editar slot" : "Nuevo slot"}>
        <div className="space-y-4">
          {errorMsg && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded-md flex items-start space-x-2">
              <AlertTriangle size={16} className="text-yellow-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-yellow-700">{errorMsg}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Recolector</label>
            <select
              value={form.gateway_id}
              onChange={(e) => setForm({ ...form, gateway_id: e.target.value })}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-papaya-orange focus:ring-papaya-orange"
            >
              <option value="">Seleccionar recolector...</option>
              {activeGateways.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rango de monto (USD)</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Desde</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="number" min={0} step={1}
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
                    type="number" min={0} step={1}
                    value={form.amount_max}
                    onChange={(e) => setForm({ ...form, amount_max: parseFloat(e.target.value) || 0 })}
                    className="block w-full rounded-md border border-gray-300 pl-7 pr-3 py-2 text-sm focus:border-papaya-orange focus:ring-papaya-orange"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox" id="gwa-active"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="rounded border-gray-300 text-papaya-orange focus:ring-papaya-orange"
            />
            <label htmlFor="gwa-active" className="text-sm text-gray-700">Slot activo</label>
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Guardando…" : "Guardar Slot"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
