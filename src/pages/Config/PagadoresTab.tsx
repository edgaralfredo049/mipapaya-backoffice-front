import React, { useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { api, Pagador, PagadorIn } from "../../api";
import { Table } from "../../components/ui/Table";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Edit2, Plus, Trash2, AlertTriangle, CheckCircle2, AlertCircle, XCircle } from "lucide-react";

type PagadorForm = {
  name: string;
  status: string;
  countries: string[];
  country_fx: Record<string, number>;
};

const EMPTY_FORM: PagadorForm = {
  name: "",
  status: "active",
  countries: [],
  country_fx: {},
};

export const PagadoresTab = () => {
  const { countries, pagadores, refreshPagadores } = useAppStore();
  const receiveCountries = countries.filter((c) => c.receive);

  const [editing, setEditing] = useState<Pagador | null>(null);
  const [form, setForm] = useState<PagadorForm>(EMPTY_FORM);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Pagador | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deleteErrorMsg, setDeleteErrorMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const getCountryName = (id: string) => countries.find((c) => c.id === id)?.name || id;

  const CompletenessIcon = ({ status }: { status: Pagador["rate_status"] }) => {
    if (status === "complete")
      return (
        <span title="Tasa de cambio configurada para todos los países">
          <CheckCircle2 size={16} className="text-emerald-500" />
        </span>
      );
    if (status === "partial")
      return (
        <span title="Tasa de cambio pendiente en algunos países">
          <AlertCircle size={16} className="text-amber-500" />
        </span>
      );
    return (
      <span title="Sin tasa de cambio configurada — el calculador fallará">
        <XCircle size={16} className="text-red-400" />
      </span>
    );
  };

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const openEdit = (p: Pagador) => {
    setEditing(p);
    setForm({
      name: p.name,
      status: p.status,
      countries: p.countries || [],
      country_fx: p.country_fx || {},
    });
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setErrorMsg("El nombre es requerido.");
      return;
    }
    if (form.countries.length === 0) {
      setErrorMsg("Debe seleccionar al menos un país destino.");
      return;
    }
    setErrorMsg(null);
    setSaving(true);
    try {
      const payload: PagadorIn = {
        name: form.name.trim(),
        status: form.status,
        countries: form.countries,
        country_fx: form.country_fx,
      };
      if (editing) {
        await api.updatePagador(editing.id, payload);
      } else {
        await api.createPagador(payload);
      }
      await refreshPagadores();
      setIsModalOpen(false);
    } catch (e: any) {
      setErrorMsg(e.message || "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteErrorMsg(null);
    try {
      await api.deletePagador(deleteTarget.id);
      await refreshPagadores();
      setDeleteTarget(null);
    } catch (e: any) {
      setDeleteErrorMsg(e.message || "Error al eliminar.");
    }
  };

  const toggleCountry = (cid: string, checked: boolean) => {
    const current = form.countries;
    const currentFx = form.country_fx;
    if (checked) {
      setForm({
        ...form,
        countries: [...current, cid],
        country_fx: { ...currentFx, [cid]: currentFx[cid] ?? 0 },
      });
    } else {
      const newFx = { ...currentFx };
      delete newFx[cid];
      setForm({
        ...form,
        countries: current.filter((id) => id !== cid),
        country_fx: newFx,
      });
    }
  };

  const renderCountriesCell = (p: Pagador) => {
    const names = (p.countries || []).map(getCountryName);
    if (names.length === 0) return <span className="text-gray-400 text-xs">Sin países</span>;
    if (names.length <= 3) return <span className="text-sm text-gray-700">{names.join(", ")}</span>;
    return (
      <span className="text-sm text-gray-700" title={names.join(", ")}>
        {names.slice(0, 2).join(", ")} y {names.length - 2} más
      </span>
    );
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={openNew}>
          <Plus size={16} className="mr-2" /> Nuevo Pagador
        </Button>
      </div>

      <Table
        data={pagadores}
        keyExtractor={(p) => p.id}
        columns={[
          { header: "Nombre", accessor: "name" },
          {
            header: "Países Destino",
            accessor: renderCountriesCell,
          },
          {
            header: "Tasa cambio",
            accessor: (p) => (
              <div className="flex items-center gap-1.5">
                <CompletenessIcon status={p.rate_status} />
                <span className="text-xs text-gray-500">
                  {p.rate_status === "complete" ? "Completa" : p.rate_status === "partial" ? "Parcial" : "Sin configurar"}
                </span>
              </div>
            ),
          },
          {
            header: "Estado",
            accessor: (p) => (
              <Badge variant={p.status === "active" ? "success" : "danger"}>
                {p.status === "active" ? "Activo" : "Inactivo"}
              </Badge>
            ),
          },
          {
            header: "Acciones",
            accessor: (p) => (
              <div className="flex space-x-2">
                <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                  <Edit2 size={16} className="text-blue-500" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setDeleteTarget(p); setDeleteErrorMsg(null); }}>
                  <Trash2 size={16} className="text-red-500" />
                </Button>
              </div>
            ),
          },
        ]}
      />

      {/* Edit / Create modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editing ? `Editar pagador — ${editing.name}` : "Nuevo pagador"}
        className="max-w-xl w-full"
      >
        <div className="space-y-6">
          {errorMsg && (
            <div className="bg-red-50 border-l-4 border-red-400 p-3 rounded-md flex items-start space-x-2">
              <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700">{errorMsg}</p>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider border-b pb-2">
              Información General
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Nombre"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                maxLength={80}
              />
              <Select
                label="Estado"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                options={[
                  { value: "active", label: "Activo" },
                  { value: "inactive", label: "Inactivo" },
                ]}
              />
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider border-b pb-2">
              Países Destino y FX%
            </h3>
            <p className="text-xs text-gray-500">
              El FX% se descuenta de la tasa de cambio del pagador para calcular la tasa Papaya.
            </p>
            <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-md bg-white divide-y divide-gray-100">
              {receiveCountries.map((c) => {
                const isChecked = form.countries.includes(c.id);
                return (
                  <div key={c.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => toggleCountry(c.id, e.target.checked)}
                      className="rounded text-papaya-orange focus:ring-papaya-orange"
                    />
                    <span className="text-sm text-gray-700 flex-1">{c.name}</span>
                    {isChecked && (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          placeholder="0"
                          value={form.country_fx[c.id] ?? 0}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              country_fx: {
                                ...form.country_fx,
                                [c.id]: parseFloat(e.target.value) || 0,
                              },
                            })
                          }
                          className="w-20 text-xs border border-gray-300 rounded px-2 py-1 focus:border-papaya-orange focus:outline-none focus:ring-1 focus:ring-papaya-orange"
                        />
                        <span className="text-xs text-gray-500">%</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => { setDeleteTarget(null); setDeleteErrorMsg(null); }}
        title="Confirmar eliminación"
      >
        <div className="space-y-4">
          {deleteErrorMsg ? (
            <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-md">
              <p className="text-sm font-semibold text-amber-800 mb-1">No se puede eliminar</p>
              <p className="text-sm text-amber-700">{deleteErrorMsg}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              ¿Eliminar el pagador{" "}
              <span className="font-semibold text-gray-900">"{deleteTarget?.name}"</span>?
              Esta acción no se puede deshacer.
            </p>
          )}
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => { setDeleteTarget(null); setDeleteErrorMsg(null); }}>
              {deleteErrorMsg ? "Cerrar" : "Cancelar"}
            </Button>
            {!deleteErrorMsg && (
              <Button variant="danger" onClick={handleDelete}>Eliminar</Button>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
};
