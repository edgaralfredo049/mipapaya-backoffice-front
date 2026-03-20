import React, { useState, useEffect } from "react";
import { useAppStore } from "../../store/useAppStore";
import { api, GatewayAlternanciaSlot, GatewayAlternanciaSlotIn } from "../../api";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Plus, Trash2, AlertCircle } from "lucide-react";

const GATEWAY_COLORS = [
  "bg-blue-100 text-blue-800 border-blue-200",
  "bg-purple-100 text-purple-800 border-purple-200",
  "bg-green-100 text-green-800 border-green-200",
  "bg-amber-100 text-amber-800 border-amber-200",
  "bg-pink-100 text-pink-800 border-pink-200",
  "bg-cyan-100 text-cyan-800 border-cyan-200",
];

const formatUSD = (n: number) => `$${Math.round(n)}`;

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

  useEffect(() => {
    setSlots(gatewayAlternancia);
  }, [gatewayAlternancia]);

  const activeGateways = gateways.filter((g) => g.status === "active");

  const getGatewayName = (id: string) => gateways.find((g) => g.id === id)?.name ?? id;

  const getColorForGateway = (id: string) => {
    const idx = gateways.findIndex((g) => g.id === id);
    return GATEWAY_COLORS[idx % GATEWAY_COLORS.length] ?? GATEWAY_COLORS[0];
  };

  const hasOverlap = (candidate: GatewayAlternanciaSlotIn, excludeId?: string): boolean => {
    return slots.some((s) => {
      if (s.id === excludeId) return false;
      if (s.gateway_id !== candidate.gateway_id) return false;
      return candidate.amount_min <= s.amount_max && s.amount_min <= candidate.amount_max;
    });
  };

  const openAdd = () => {
    setEditingSlot(null);
    setForm(defaultForm());
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const openEdit = (slot: GatewayAlternanciaSlot) => {
    setEditingSlot(slot);
    setForm({
      gateway_id: slot.gateway_id,
      amount_min: slot.amount_min,
      amount_max: slot.amount_max,
      active: slot.active,
    });
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSlot(null);
  };

  const handleSave = async () => {
    if (!form.gateway_id) { setErrorMsg("Selecciona un recolector."); return; }
    if (form.amount_min >= form.amount_max) { setErrorMsg("El monto mínimo debe ser menor que el máximo."); return; }
    if (hasOverlap(form, editingSlot?.id)) {
      setErrorMsg("El rango de montos se superpone con otro slot del mismo recolector.");
      return;
    }

    setSaving(true);
    try {
      let updated: GatewayAlternanciaSlot[];
      if (editingSlot) {
        updated = slots.map((s) =>
          s.id === editingSlot.id ? { ...s, ...form } : s
        );
      } else {
        updated = [...slots, { id: crypto.randomUUID(), ...form }];
      }

      const toSave: GatewayAlternanciaSlotIn[] = updated.map(({ id: _id, ...rest }) => rest);
      const result = await api.replaceGatewayAlternancia(toSave);
      await refreshGatewayAlternancia();
      setSlots(result);
      closeModal();
    } catch (e: any) {
      setErrorMsg(e.message ?? "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (slotId: string) => {
    setSaving(true);
    try {
      const updated = slots.filter((s) => s.id !== slotId);
      const toSave: GatewayAlternanciaSlotIn[] = updated.map(({ id: _id, ...rest }) => rest);
      const result = await api.replaceGatewayAlternancia(toSave);
      await refreshGatewayAlternancia();
      setSlots(result);
    } catch (e: any) {
      setErrorMsg(e.message ?? "Error al eliminar.");
    } finally {
      setSaving(false);
    }
  };

  // Group by gateway for display
  const slotsByGateway = activeGateways
    .map((g) => ({ gateway: g, slots: slots.filter((s) => s.gateway_id === g.id) }))
    .filter(({ slots }) => slots.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Define qué recolector usar según el monto enviado (en USD). Si el monto cae en un rango configurado, ese recolector tiene prioridad.
        </p>
        <Button onClick={openAdd} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Agregar slot
        </Button>
      </div>

      {slots.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          Sin slots configurados — se usará la lógica estándar de recolectores.
        </div>
      ) : (
        <div className="space-y-4">
          {slotsByGateway.map(({ gateway, slots: gwSlots }) => (
            <div key={gateway.id} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className={`px-4 py-2 text-sm font-medium border-b ${getColorForGateway(gateway.id)}`}>
                {gateway.name}
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Monto mín.</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Monto máx.</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Estado</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {gwSlots.sort((a, b) => a.amount_min - b.amount_min).map((slot) => (
                    <tr key={slot.id} className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => openEdit(slot)}>
                      <td className="px-4 py-2 font-mono">{formatUSD(slot.amount_min)}</td>
                      <td className="px-4 py-2 font-mono">{formatUSD(slot.amount_max)}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${slot.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {slot.active ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleDelete(slot.id)}
                          className="text-red-400 hover:text-red-600 p-1 rounded"
                          disabled={saving}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          {/* Slots for gateways not in activeGateways list (inactive gateways) */}
          {slots.filter((s) => !activeGateways.some((g) => g.id === s.gateway_id)).map((slot) => (
            <div key={slot.id} className="border border-gray-200 rounded-lg p-3 flex items-center justify-between text-sm text-gray-500">
              <span>{getGatewayName(slot.gateway_id)} — {formatUSD(slot.amount_min)} a {formatUSD(slot.amount_max)}</span>
              <button onClick={() => handleDelete(slot.id)} className="text-red-400 hover:text-red-600 p-1" disabled={saving}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingSlot ? "Editar slot" : "Nuevo slot"}>
        <div className="space-y-4">
          {errorMsg && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Recolector</label>
            <select
              value={form.gateway_id}
              onChange={(e) => setForm({ ...form, gateway_id: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-papaya-orange"
            >
              <option value="">Seleccionar recolector...</option>
              {activeGateways.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto mín. (USD)</label>
              <input
                type="number"
                min={0}
                step={1}
                value={form.amount_min}
                onChange={(e) => setForm({ ...form, amount_min: Number(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-papaya-orange"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto máx. (USD)</label>
              <input
                type="number"
                min={0}
                step={1}
                value={form.amount_max}
                onChange={(e) => setForm({ ...form, amount_max: Number(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-papaya-orange"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="gwa-active"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="rounded border-gray-300 text-papaya-orange focus:ring-papaya-orange"
            />
            <label htmlFor="gwa-active" className="text-sm text-gray-700">Slot activo</label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={closeModal}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
