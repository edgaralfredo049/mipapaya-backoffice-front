import React, { useState, useEffect } from "react";
import { useAuthStore } from "../../store/useAuthStore";
import { api, ComplianceAlert, ComplianceAlertIn } from "../../api";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";

const EMPTY_FORM: ComplianceAlertIn = { name: "", description: "", active: true };

function ActiveToggle({ active, onClick, disabled }: { active: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
        active ? "bg-green-500" : "bg-gray-300"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${active ? "translate-x-4.5" : "translate-x-0.5"}`} />
    </button>
  );
}

export const AlertasTab = () => {
  const canWrite = useAuthStore(s => s.hasPermission("configuracion", true));
  const [alerts, setAlerts]   = useState<ComplianceAlert[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modal, setModal]         = useState<{ mode: "create" | "edit"; alert?: ComplianceAlert } | null>(null);
  const [form, setForm]           = useState<ComplianceAlertIn>(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<ComplianceAlert | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError]     = useState<string | null>(null);

  // Toggle active
  const [toggling, setToggling] = useState<number | null>(null);

  useEffect(() => {
    api.getComplianceAlerts()
      .then(setAlerts)
      .finally(() => setLoading(false));
  }, []);

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setModal({ mode: "create" });
  }

  function openEdit(alert: ComplianceAlert) {
    setForm({ name: alert.name, description: alert.description, active: alert.active });
    setFormError(null);
    setModal({ mode: "edit", alert });
  }

  function closeModal() {
    setModal(null);
    setFormError(null);
  }

  async function saveModal() {
    if (!form.name.trim())        { setFormError("El nombre es obligatorio."); return; }
    if (!form.description.trim()) { setFormError("La descripción es obligatoria."); return; }

    setSaving(true);
    setFormError(null);
    try {
      if (modal?.mode === "create") {
        const created = await api.createComplianceAlert({ ...form, name: form.name.trim(), description: form.description.trim() });
        setAlerts(prev => [...prev, created]);
      } else if (modal?.alert) {
        const updated = await api.updateComplianceAlert(modal.alert.id, { ...form, name: form.name.trim(), description: form.description.trim() });
        setAlerts(prev => prev.map(a => a.id === modal.alert!.id ? updated : a));
      }
      closeModal();
    } catch (e: any) {
      setFormError(e?.detail ?? "Error al guardar la alerta.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(alert: ComplianceAlert) {
    if (toggling) return;
    setToggling(alert.id);
    try {
      const updated = await api.updateComplianceAlert(alert.id, {
        name: alert.name,
        description: alert.description,
        active: !alert.active,
      });
      setAlerts(prev => prev.map(a => a.id === alert.id ? updated : a));
    } catch {
      // silent
    } finally {
      setToggling(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await api.deleteComplianceAlert(deleteTarget.id);
      setAlerts(prev => prev.filter(a => a.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e: any) {
      setDeleteError(e?.detail ?? "Error al eliminar la alerta.");
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Configura las alertas de cumplimiento que se evaluarán en las transacciones.
        </p>
        {canWrite && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-papaya-orange px-3 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Nueva alerta
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[1, 2, 3].map(i => <div key={i} className="h-14 bg-gray-100 rounded-lg" />)}
        </div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm">No hay alertas configuradas.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Nombre</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wide">Descripción</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500 text-xs uppercase tracking-wide w-20">Activa</th>
                {canWrite && <th className="px-4 py-3 text-right font-medium text-gray-500 text-xs uppercase tracking-wide w-24">Acciones</th>}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {alerts.map(alert => (
                <tr key={alert.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800">{alert.name}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-sm">
                    <span className="line-clamp-2">{alert.description}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center">
                      <ActiveToggle
                        active={alert.active}
                        onClick={() => canWrite && toggleActive(alert)}
                        disabled={!canWrite || toggling === alert.id}
                      />
                    </div>
                  </td>
                  {canWrite && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEdit(alert)}
                          className="text-gray-400 hover:text-papaya-orange transition-colors"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => { setDeleteError(null); setDeleteTarget(alert); }}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-800">
                {modal.mode === "create" ? "Nueva alerta" : "Editar alerta"}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-papaya-orange focus:outline-none"
                  placeholder="Ej. Remesa de alto valor"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Descripción</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-papaya-orange focus:outline-none resize-none"
                  placeholder="Describe cuándo se activa esta alerta..."
                />
              </div>
              <div className="flex items-center gap-2">
                <ActiveToggle
                  active={form.active}
                  onClick={() => setForm(f => ({ ...f, active: !f.active }))}
                />
                <span className="text-sm text-gray-600">{form.active ? "Activa" : "Inactiva"}</span>
              </div>
            </div>

            {formError && <p className="text-xs text-red-500">{formError}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={closeModal} className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={saveModal}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-papaya-orange px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Guardando..." : <><Check className="h-4 w-4" /> Guardar</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-800">Eliminar alerta</h2>
            <p className="text-sm text-gray-500">
              ¿Estás seguro de eliminar <span className="font-medium text-gray-700">{deleteTarget.name}</span>? Esta acción no se puede deshacer.
            </p>
            {deleteError && <p className="text-xs text-red-500">{deleteError}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteLoading}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
              >
                {deleteLoading ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
