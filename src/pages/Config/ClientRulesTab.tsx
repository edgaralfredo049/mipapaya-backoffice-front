import React, { useState, useEffect } from "react";
import { useAuthStore } from "../../store/useAuthStore";
import { api, ClientRule, ClientRuleIn } from "../../api";
import { Plus, Trash2, X, Check } from "lucide-react";
import { Pagination } from "../../components/ui/Pagination";

// ── Styles ────────────────────────────────────────────────────────────────────

const cellInput    = "w-full rounded border border-gray-300 px-2 py-1 text-xs font-mono focus:border-papaya-orange focus:outline-none bg-white";
const cellInputErr = "w-full rounded border border-red-400 px-2 py-1 text-xs font-mono focus:outline-none bg-red-50";
const cellText     = "w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-papaya-orange focus:outline-none bg-white";
const cellTextErr  = "w-full rounded border border-red-400 px-2 py-1 text-xs focus:outline-none bg-red-50";

const PAGE_SIZE = 10;

function fmtDate(s: string) {
  return new Date(s).toLocaleString("es", { dateStyle: "short", timeStyle: "short" });
}

function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
      active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
    }`}>
      {active ? "Activa" : "Inactiva"}
    </span>
  );
}

function ValidateChips({ doc, name, address }: { doc: boolean; name: boolean; address: boolean }) {
  const chip = (label: string, on: boolean) => (
    <span key={label} className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${on ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-400"}`}>
      {label}
    </span>
  );
  return <div className="flex gap-1 flex-wrap justify-center">{chip("Cédula", doc)}{chip("Nombre", name)}{chip("Dirección", address)}</div>;
}

function ValidateCheckboxes({ doc, name, address, onChange }: {
  doc: boolean; name: boolean; address: boolean;
  onChange: (field: "validate_doc_number" | "validate_name" | "validate_address", val: boolean) => void;
}) {
  const cb = (label: string, field: "validate_doc_number" | "validate_name" | "validate_address", val: boolean) => (
    <label key={field} className="flex items-center gap-1 text-[10px] text-gray-600 cursor-pointer whitespace-nowrap">
      <input type="checkbox" checked={val} onChange={e => onChange(field, e.target.checked)} className="accent-papaya-orange w-3 h-3" />
      {label}
    </label>
  );
  return (
    <div className="flex flex-col gap-1">
      {cb("Cédula", "validate_doc_number", doc)}
      {cb("Nombre", "validate_name", name)}
      {cb("Dirección", "validate_address", address)}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export const ClientRulesTab = () => {
  const canWrite = useAuthStore(s => s.hasPermission("configuracion", true));
  const [rules,   setRules]   = useState<ClientRule[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination
  const [page, setPage] = useState(1);

  // New row
  const [newRow,    setNewRow]    = useState<Partial<ClientRuleIn> | null>(null);
  const [newError,  setNewError]  = useState<string | null>(null);
  const [newSaving, setNewSaving] = useState(false);

  // Inline edit (monto + descripción only)
  const [editingId,  setEditingId]  = useState<number | null>(null);
  const [editForm,   setEditForm]   = useState<Partial<ClientRuleIn>>({});
  const [editError,  setEditError]  = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // Delete
  const [deleteId,     setDeleteId]     = useState<number | null>(null);
  const [deleteError,  setDeleteError]  = useState<string | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  // Active toggle modal
  const [activeModal, setActiveModal] = useState<{ rule: ClientRule; next: boolean } | null>(null);
  const [activeSaving, setActiveSaving] = useState(false);
  const [activeError,  setActiveError]  = useState<string | null>(null);

  useEffect(() => {
    api.getClientRules()
      .then(setRules)
      .finally(() => setLoading(false));
  }, []);

  const totalPages = Math.max(1, Math.ceil(rules.length / PAGE_SIZE));
  const paginated  = rules.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Handlers: new row ──────────────────────────────────────────────────────

  function startNew() {
    setEditingId(null);
    setDeleteId(null);
    setNewRow({ max_amount_usd: undefined, document_description: "", active: true, validate_doc_number: true, validate_name: true, validate_address: false });
    setNewError(null);
  }

  function setN<K extends keyof ClientRuleIn>(key: K, value: ClientRuleIn[K]) {
    setNewRow(r => r ? { ...r, [key]: value } : r);
  }

  async function saveNew() {
    if (!newRow) return;
    const amt = Number(newRow.max_amount_usd);
    if (!amt || amt <= 0) { setNewError("El monto tope debe ser mayor a 0."); return; }
    if (!newRow.document_description?.trim()) { setNewError("La descripción es obligatoria."); return; }

    setNewSaving(true);
    setNewError(null);
    try {
      const created = await api.createClientRule({
        max_amount_usd: amt,
        document_description: newRow.document_description.trim(),
        active: newRow.active ?? true,
        validate_doc_number: newRow.validate_doc_number ?? true,
        validate_name: newRow.validate_name ?? true,
        validate_address: newRow.validate_address ?? false,
      });
      setRules(prev => [...prev, created].sort((a, b) => a.max_amount_usd - b.max_amount_usd));
      setNewRow(null);
    } catch (e: any) {
      setNewError(e?.detail ?? "Error al crear la regla.");
    } finally {
      setNewSaving(false);
    }
  }

  function cancelNew() {
    setNewRow(null);
    setNewError(null);
  }

  // ── Handlers: edit ────────────────────────────────────────────────────────

  function startEdit(rule: ClientRule) {
    setNewRow(null);
    setDeleteId(null);
    setEditingId(rule.id);
    setEditForm({ max_amount_usd: rule.max_amount_usd, document_description: rule.document_description, active: rule.active, validate_doc_number: rule.validate_doc_number, validate_name: rule.validate_name, validate_address: rule.validate_address });
    setEditError(null);
  }

  function setE<K extends keyof ClientRuleIn>(key: K, value: ClientRuleIn[K]) {
    setEditForm(f => ({ ...f, [key]: value }));
  }

  async function saveEdit() {
    if (!editingId) return;
    const amt = Number(editForm.max_amount_usd);
    if (!amt || amt <= 0) { setEditError("El monto tope debe ser mayor a 0."); return; }
    if (!editForm.document_description?.trim()) { setEditError("La descripción es obligatoria."); return; }

    setEditSaving(true);
    setEditError(null);
    try {
      const updated = await api.updateClientRule(editingId, {
        max_amount_usd: amt,
        document_description: editForm.document_description.trim(),
        active: editForm.active ?? true,
        validate_doc_number: editForm.validate_doc_number ?? true,
        validate_name: editForm.validate_name ?? true,
        validate_address: editForm.validate_address ?? false,
      });
      setRules(prev => prev.map(r => r.id === editingId ? updated : r).sort((a, b) => a.max_amount_usd - b.max_amount_usd));
      setEditingId(null);
    } catch (e: any) {
      setEditError(e?.detail ?? "Error al actualizar la regla.");
    } finally {
      setEditSaving(false);
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError(null);
  }

  // ── Handlers: delete ──────────────────────────────────────────────────────

  async function confirmDelete() {
    if (!deleteId) return;
    setDeleteSaving(true);
    setDeleteError(null);
    try {
      await api.deleteClientRule(deleteId);
      setRules(prev => prev.filter(r => r.id !== deleteId));
      setDeleteId(null);
    } catch (e: any) {
      setDeleteError(e?.detail ?? "Error al eliminar la regla.");
    } finally {
      setDeleteSaving(false);
    }
  }

  // ── Handlers: active modal ─────────────────────────────────────────────────

  function openActiveModal(e: React.MouseEvent, rule: ClientRule) {
    e.stopPropagation();
    setActiveModal({ rule, next: !rule.active });
    setActiveError(null);
  }

  async function confirmActiveToggle() {
    if (!activeModal) return;
    setActiveSaving(true);
    setActiveError(null);
    try {
      const updated = await api.updateClientRule(activeModal.rule.id, {
        max_amount_usd: activeModal.rule.max_amount_usd,
        document_description: activeModal.rule.document_description,
        active: activeModal.next,
        validate_doc_number: activeModal.rule.validate_doc_number,
        validate_name: activeModal.rule.validate_name,
        validate_address: activeModal.rule.validate_address,
      });
      setRules(prev => prev.map(r => r.id === updated.id ? updated : r));
      setActiveModal(null);
    } catch (e: any) {
      setActiveError(e?.detail ?? "Error al actualizar el estado.");
    } finally {
      setActiveSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-10 bg-gray-100 rounded-lg w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {rules.length} {rules.length === 1 ? "regla" : "reglas"} configurada{rules.length !== 1 ? "s" : ""}
        </p>
        {canWrite && (
          <button
            onClick={startNew}
            disabled={!!newRow}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-papaya-orange text-white text-xs font-medium hover:bg-orange-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus size={13} /> Nueva regla
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap w-48">
                  Monto tope (USD)
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Documento requerido
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap text-center">
                  Validar
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap w-24 text-center">
                  Estado
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap w-36">
                  Creado
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap w-36">
                  Actualizado
                </th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">

              {/* New row */}
              {newRow && (
                <>
                  <tr className="bg-blue-50/50">
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="0.00"
                        value={newRow.max_amount_usd ?? ""}
                        onChange={e => setN("max_amount_usd", parseFloat(e.target.value) as any)}
                        className={newError && !newRow.max_amount_usd ? cellInputErr : cellInput}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        placeholder="Ej: Comprobante de ingresos"
                        value={newRow.document_description ?? ""}
                        onChange={e => setN("document_description", e.target.value)}
                        className={newError && !newRow.document_description?.trim() ? cellTextErr : cellText}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <ValidateCheckboxes
                        doc={newRow?.validate_doc_number ?? true}
                        name={newRow?.validate_name ?? true}
                        address={newRow?.validate_address ?? false}
                        onChange={(f, v) => setN(f, v as any)}
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      {/* Inline toggle allowed on new rows — no existing state to confirm */}
                      <button
                        type="button"
                        onClick={() => setN("active", !(newRow?.active ?? true))}
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
                          (newRow?.active ?? true) ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {(newRow?.active ?? true) ? "Activa" : "Inactiva"}
                      </button>
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-400">—</td>
                    <td className="px-4 py-2 text-xs text-gray-400">—</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1.5 justify-end">
                        <button onClick={saveNew} disabled={newSaving} className="p-1 rounded hover:bg-green-100 text-green-600 transition-colors disabled:opacity-40" title="Guardar">
                          <Check size={15} />
                        </button>
                        <button onClick={cancelNew} className="p-1 rounded hover:bg-gray-100 text-gray-400 transition-colors" title="Cancelar">
                          <X size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {newError && (
                    <tr className="bg-blue-50/30">
                      <td colSpan={6} className="px-4 pb-2 text-xs text-red-500">{newError}</td>
                    </tr>
                  )}
                </>
              )}

              {/* Empty state */}
              {rules.length === 0 && !newRow && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">
                    No hay reglas configuradas. Agrega la primera.
                  </td>
                </tr>
              )}

              {/* Data rows */}
              {paginated.map(rule => {
                const isEditing  = editingId === rule.id;
                const isDeleting = deleteId  === rule.id;

                if (isDeleting) {
                  return (
                    <React.Fragment key={rule.id}>
                      <tr className="bg-red-50/60">
                        <td className="px-4 py-3 text-xs font-mono text-gray-700">${rule.max_amount_usd.toFixed(2)}</td>
                        <td className="px-4 py-3 text-xs text-gray-700">{rule.document_description}</td>
                        <td colSpan={4} className="px-4 py-3 text-xs text-red-600 font-medium">¿Eliminar esta regla?</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 justify-end">
                            <button onClick={confirmDelete} disabled={deleteSaving} className="p-1 rounded hover:bg-red-100 text-red-600 transition-colors disabled:opacity-40" title="Confirmar">
                              <Check size={15} />
                            </button>
                            <button onClick={() => { setDeleteId(null); setDeleteError(null); }} className="p-1 rounded hover:bg-gray-100 text-gray-400 transition-colors" title="Cancelar">
                              <X size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {deleteError && (
                        <tr className="bg-red-50/40">
                          <td colSpan={6} className="px-4 pb-2 text-xs text-red-500">{deleteError}</td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                }

                if (isEditing) {
                  return (
                    <React.Fragment key={rule.id}>
                      <tr className="bg-yellow-50/50">
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={editForm.max_amount_usd ?? ""}
                            onChange={e => setE("max_amount_usd", parseFloat(e.target.value) as any)}
                            className={editError && !editForm.max_amount_usd ? cellInputErr : cellInput}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={editForm.document_description ?? ""}
                            onChange={e => setE("document_description", e.target.value)}
                            className={editError && !editForm.document_description?.trim() ? cellTextErr : cellText}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <ValidateCheckboxes
                            doc={editForm.validate_doc_number ?? true}
                            name={editForm.validate_name ?? true}
                            address={editForm.validate_address ?? false}
                            onChange={(f, v) => setE(f, v as any)}
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
                          <ActiveBadge active={editForm.active ?? true} />
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-400">{fmtDate(rule.created_at)}</td>
                        <td className="px-4 py-2 text-xs text-gray-400">{fmtDate(rule.updated_at)}</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-1.5 justify-end">
                            <button onClick={saveEdit} disabled={editSaving} className="p-1 rounded hover:bg-green-100 text-green-600 transition-colors disabled:opacity-40" title="Guardar">
                              <Check size={15} />
                            </button>
                            <button onClick={cancelEdit} className="p-1 rounded hover:bg-gray-100 text-gray-400 transition-colors" title="Cancelar">
                              <X size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {editError && (
                        <tr className="bg-yellow-50/30">
                          <td colSpan={6} className="px-4 pb-2 text-xs text-red-500">{editError}</td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                }

                return (
                  <tr
                    key={rule.id}
                    onClick={() => canWrite && startEdit(rule)}
                    className={`hover:bg-gray-50/60 transition-colors ${canWrite ? "cursor-pointer" : ""}`}
                  >
                    <td className="px-4 py-3 text-xs font-mono text-gray-800 font-medium">
                      ${rule.max_amount_usd.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700">{rule.document_description}</td>
                    <td className="px-4 py-3 text-center">
                      <ValidateChips doc={rule.validate_doc_number} name={rule.validate_name} address={rule.validate_address} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {canWrite ? (
                        <button
                          onClick={e => openActiveModal(e, rule)}
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium transition-opacity hover:opacity-75 ${
                            rule.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {rule.active ? "Activa" : "Inactiva"}
                        </button>
                      ) : (
                        <ActiveBadge active={rule.active} />
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{fmtDate(rule.created_at)}</td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{fmtDate(rule.updated_at)}</td>
                    <td className="px-4 py-3">
                      {canWrite && (
                        <button
                          onClick={e => { e.stopPropagation(); setEditingId(null); setNewRow(null); setDeleteId(rule.id); setDeleteError(null); }}
                          className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-50">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>

      {/* Active toggle confirmation modal */}
      {activeModal && canWrite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-80 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">
              {activeModal.next ? "Activar regla" : "Desactivar regla"}
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              ¿Desea <span className="font-semibold">{activeModal.next ? "activar" : "desactivar"}</span> la regla{" "}
              <span className="italic text-gray-800">"{activeModal.rule.document_description}"</span>?
            </p>
            {activeError && <p className="text-xs text-red-500">{activeError}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => { setActiveModal(null); setActiveError(null); }}
                className="px-4 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmActiveToggle}
                disabled={activeSaving}
                className={`px-4 py-2 rounded-lg text-white text-xs font-medium transition-colors disabled:opacity-40 ${
                  activeModal.next
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-gray-600 hover:bg-gray-700"
                }`}
              >
                {activeSaving ? "Guardando…" : activeModal.next ? "Sí, activar" : "Sí, desactivar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
