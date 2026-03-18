import React, { useState, useEffect } from "react";
import { useAppStore } from "../../store/useAppStore";
import { api, AlternanciaSlot, AlternanciaSlotIn } from "../../api";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Plus, Trash2, AlertTriangle, Clock } from "lucide-react";
import { PAGADOR_COLORS } from "../../data/constants";

const getColorForPagador = (pagadorId: string, pagadores: any[]) => {
  const idx = pagadores.findIndex((p) => p.id === pagadorId);
  return PAGADOR_COLORS[idx % PAGADOR_COLORS.length] || PAGADOR_COLORS[0];
};

const formatHour = (h: number) => `${String(h).padStart(2, "0")}:00`;

const hasOverlap = (
  slots: AlternanciaSlot[],
  candidate: AlternanciaSlot,
  excludeId?: string
): boolean => {
  const sameCountry = slots.filter(
    (s) => s.country_id === candidate.country_id && s.id !== excludeId
  );
  const cStart = candidate.hour_start;
  const cEnd = candidate.hour_end > candidate.hour_start ? candidate.hour_end : candidate.hour_end + 24;
  for (const s of sameCountry) {
    const sStart = s.hour_start;
    const sEnd = s.hour_end > s.hour_start ? s.hour_end : s.hour_end + 24;
    if (cStart < sEnd && cEnd > sStart) return true;
  }
  return false;
};

export const AlternanciaView = () => {
  const { alternancia, pagadores, countries, refreshAlternancia } = useAppStore();
  const [slots, setSlots] = useState<AlternanciaSlot[]>([]);
  const [selectedCountryId, setSelectedCountryId] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<AlternanciaSlot | null>(null);
  const [form, setForm] = useState({ country_id: "", pagador_id: "", hour_start: -1, hour_end: -1 });
  const [saving, setSaving] = useState(false);

  const activePagadores = pagadores.filter((p) => p.status === "active");

  const availableCountryIds = Array.from(
    new Set(activePagadores.flatMap((p) => p.countries || []))
  ).sort();

  const getCountryName = (id: string) => countries.find((c) => c.id === id)?.name || id;

  useEffect(() => {
    setSlots(alternancia);
  }, [alternancia]);

  useEffect(() => {
    if (availableCountryIds.length > 0 && !selectedCountryId) {
      setSelectedCountryId(availableCountryIds[0]);
    }
  }, [availableCountryIds, selectedCountryId]);

  const filteredSlots = slots
    .filter((s) => s.country_id === selectedCountryId)
    .sort((a, b) => a.hour_start - b.hour_start);

  const openAddModal = () => {
    setEditingSlot(null);
    setForm({ country_id: selectedCountryId, pagador_id: "", hour_start: -1, hour_end: -1 });
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const openEditModal = (slot: AlternanciaSlot) => {
    setEditingSlot(slot);
    setForm({
      country_id: slot.country_id,
      pagador_id: slot.pagador_id,
      hour_start: slot.hour_start,
      hour_end: slot.hour_end,
    });
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const persist = async (updated: AlternanciaSlot[]) => {
    setSaving(true);
    try {
      const payload: AlternanciaSlotIn[] = updated.map(
        ({ country_id, pagador_id, hour_start, hour_end, active }) => ({
          country_id, pagador_id, hour_start, hour_end, active,
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
    if (!form.country_id || !form.pagador_id || form.hour_start === -1 || form.hour_end === -1) {
      setErrorMsg("Todos los campos son obligatorios.");
      return;
    }
    if (form.hour_start === form.hour_end) {
      setErrorMsg("La hora de inicio y fin no pueden ser iguales.");
      return;
    }
    const candidate: AlternanciaSlot = {
      id: editingSlot?.id || `tmp-${Date.now()}`,
      country_id: form.country_id,
      pagador_id: form.pagador_id,
      hour_start: form.hour_start,
      hour_end: form.hour_end,
      active: true,
    };
    if (hasOverlap(slots, candidate, editingSlot?.id)) {
      setErrorMsg("Este horario se superpone con otro segmento del mismo país.");
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

  const renderTimeline = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center mb-3 space-x-2">
          <Clock size={16} className="text-gray-400" />
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Timeline 24h — {getCountryName(selectedCountryId)}
          </p>
        </div>
        <div className="relative h-10 rounded-lg overflow-hidden bg-gray-100 flex">
          {hours.map((h) => {
            const slot = filteredSlots.find((s) => {
              if (s.hour_end > s.hour_start) return h >= s.hour_start && h < s.hour_end;
              return h >= s.hour_start || h < s.hour_end;
            });
            const color = slot ? getColorForPagador(slot.pagador_id, activePagadores) : null;
            return (
              <div
                key={h}
                className={`flex-1 border-r border-white/20 ${color ? color.bg : "bg-gray-100"}`}
                title={
                  slot
                    ? `${formatHour(h)}: ${activePagadores.find((p) => p.id === slot.pagador_id)?.name}`
                    : formatHour(h)
                }
              />
            );
          })}
        </div>
        <div className="flex justify-between mt-1">
          {[0, 6, 12, 18, 23].map((h) => (
            <span key={h} className="text-[10px] text-gray-400">{formatHour(h)}</span>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 mt-3">
          {activePagadores.map((p) => {
            if (!slots.some((s) => s.country_id === selectedCountryId && s.pagador_id === p.id)) return null;
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
            Define qué pagador atiende cada franja horaria por país destino.
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
                ({slots.filter((s) => s.country_id === cid).length})
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
                        <div className={`w-2 h-8 rounded-full ${color.bg}`} />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {pagador?.name || slot.pagador_id}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatHour(slot.hour_start)} – {formatHour(slot.hour_end)}
                            {slot.hour_end < slot.hour_start && " (+1 día)"}
                          </p>
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

          <div className="flex justify-end space-x-3 pt-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveSlot}>Guardar Franja</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
