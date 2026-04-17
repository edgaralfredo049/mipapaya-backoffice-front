import React, { useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { useAuthStore } from "../../store/useAuthStore";
import { api, Partnership } from "../../api";
import { Plus, Check, X, Trash2, AlertTriangle } from "lucide-react";

const cellInput =
  "w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-papaya-orange focus:outline-none bg-white";

export const AlianzasTab = () => {
  const { partnerships, refreshPartnerships } = useAppStore();
  const canWrite = useAuthStore(s => s.hasPermission("configuracion", true));

  const [editingId,   setEditingId]   = useState<number | null>(null);
  const [editName,    setEditName]    = useState("");
  const [editSaving,  setEditSaving]  = useState(false);
  const [editError,   setEditError]   = useState<string | null>(null);

  const [newName,     setNewName]     = useState("");
  const [newSaving,   setNewSaving]   = useState(false);
  const [newError,    setNewError]    = useState<string | null>(null);
  const [showNew,     setShowNew]     = useState(false);

  const [deleteId,    setDeleteId]    = useState<number | null>(null);
  const [deleteSaving,setDeleteSaving]= useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function startEdit(p: Partnership) {
    setEditingId(p.id);
    setEditName(p.name);
    setEditError(null);
    setShowNew(false);
    setDeleteId(null);
  }

  function cancelEdit() { setEditingId(null); setEditError(null); }

  async function saveEdit() {
    if (!editingId || !editName.trim()) return;
    setEditSaving(true);
    setEditError(null);
    try {
      await api.updatePartnership(editingId, editName.trim());
      await refreshPartnerships();
      setEditingId(null);
    } catch (e: unknown) {
      setEditError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setEditSaving(false);
    }
  }

  async function saveNew() {
    if (!newName.trim()) return;
    setNewSaving(true);
    setNewError(null);
    try {
      await api.createPartnership(newName.trim());
      await refreshPartnerships();
      setNewName("");
      setShowNew(false);
    } catch (e: unknown) {
      setNewError(e instanceof Error ? e.message : "Error al crear");
    } finally {
      setNewSaving(false);
    }
  }

  async function confirmDelete(id: number) {
    setDeleteSaving(true);
    setDeleteError(null);
    try {
      await api.deletePartnership(id);
      await refreshPartnerships();
      setDeleteId(null);
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e.message : "Error al eliminar");
    } finally {
      setDeleteSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {canWrite && (
          <button
            onClick={() => { setShowNew(true); setEditingId(null); setNewName(""); setNewError(null); }}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-lg bg-papaya-orange text-white hover:bg-papaya-orange/90 shadow-sm transition-all"
          >
            <Plus size={14} /> Nueva alianza
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">ID</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nombre</th>
              <th className="px-4 py-3 w-28" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {showNew && (
              <>
                <tr className="bg-blue-50/40">
                  <td className="px-4 py-2 text-xs text-gray-400">—</td>
                  <td className="px-4 py-2">
                    <input
                      autoFocus
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") saveNew(); if (e.key === "Escape") setShowNew(false); }}
                      placeholder="Nombre de la alianza…"
                      className={cellInput}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1">
                      <button onClick={saveNew} disabled={newSaving || !newName.trim()}
                        className="p-1.5 rounded-lg hover:bg-green-100 text-green-600 disabled:opacity-40 transition-colors" title="Guardar">
                        <Check size={14} />
                      </button>
                      <button onClick={() => setShowNew(false)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title="Cancelar">
                        <X size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
                {newError && (
                  <tr className="bg-red-50">
                    <td colSpan={3} className="px-4 py-2 text-xs text-red-700">
                      <AlertTriangle size={12} className="inline mr-1 text-red-500" />{newError}
                    </td>
                  </tr>
                )}
              </>
            )}

            {partnerships.length === 0 && !showNew && (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-sm text-gray-400">
                  Sin alianzas registradas
                </td>
              </tr>
            )}

            {partnerships.map((p) => {
              const isEditing  = editingId === p.id;
              const isDeleting = deleteId === p.id;

              if (isEditing) {
                return (
                  <React.Fragment key={p.id}>
                    <tr className="bg-yellow-50/50">
                      <td className="px-4 py-2 text-xs font-mono text-gray-400">{p.id}</td>
                      <td className="px-4 py-2">
                        <input
                          autoFocus
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                          className={cellInput}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1">
                          <button onClick={saveEdit} disabled={editSaving || !editName.trim()}
                            className="p-1.5 rounded-lg hover:bg-green-100 text-green-600 disabled:opacity-40 transition-colors" title="Guardar">
                            <Check size={14} />
                          </button>
                          <button onClick={cancelEdit}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title="Cancelar">
                            <X size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {editError && (
                      <tr className="bg-red-50">
                        <td colSpan={3} className="px-4 py-2 text-xs text-red-700">
                          <AlertTriangle size={12} className="inline mr-1 text-red-500" />{editError}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              }

              if (isDeleting) {
                return (
                  <React.Fragment key={p.id}>
                    <tr className="bg-red-50/50">
                      <td className="px-4 py-2 text-xs font-mono text-gray-400">{p.id}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{p.name}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-red-600 font-medium">¿Eliminar?</span>
                          <button onClick={() => confirmDelete(p.id)} disabled={deleteSaving}
                            className="p-1.5 rounded-lg hover:bg-red-100 text-red-600 disabled:opacity-40 transition-colors" title="Confirmar">
                            <Check size={14} />
                          </button>
                          <button onClick={() => { setDeleteId(null); setDeleteError(null); }}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title="Cancelar">
                            <X size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {deleteError && (
                      <tr className="bg-red-50">
                        <td colSpan={3} className="px-4 py-2 text-xs text-red-700">
                          <AlertTriangle size={12} className="inline mr-1 text-red-500" />{deleteError}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              }

              return (
                <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-3 text-xs font-mono text-gray-400">{p.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                  <td className="px-4 py-3">
                    {canWrite && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => startEdit(p)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 hover:text-blue-700 transition-colors" title="Editar">
                          ✎
                        </button>
                        <button onClick={() => { setDeleteId(p.id); setDeleteError(null); setEditingId(null); }}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors" title="Eliminar">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
