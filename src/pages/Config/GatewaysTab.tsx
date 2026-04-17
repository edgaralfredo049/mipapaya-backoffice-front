import React, { useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { useAuthStore } from "../../store/useAuthStore";
import { api, Gateway, GatewayIn } from "../../api";
import { Table } from "../../components/ui/Table";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Edit2, Plus, Trash2, AlertTriangle } from "lucide-react";

type GatewayForm = {
  name: string;
  status: string;
  origin_countries: string[];
  coverage_mode: string;
  coverage_states: string[];
};

const EMPTY_FORM: GatewayForm = {
  name: "",
  status: "active",
  origin_countries: ["US"],
  coverage_mode: "all",
  coverage_states: [],
};

export const GatewaysTab = () => {
  const { countries, states, gateways, refreshGateways } = useAppStore();
  const canWrite = useAuthStore(s => s.hasPermission("configuracion", true));
  const usStates = states.filter((s) => s.country_id === "US");
  const sendCountries = countries.filter((c) => c.send);

  const [editing, setEditing] = useState<Gateway | null>(null);
  const [form, setForm] = useState<GatewayForm>(EMPTY_FORM);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Gateway | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deleteErrorMsg, setDeleteErrorMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const getCountryName = (id: string) => countries.find((c) => c.id === id)?.name || id;

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const openEdit = (gw: Gateway) => {
    setEditing(gw);
    setForm({
      name: gw.name,
      status: gw.status,
      origin_countries: gw.origin_countries || [],
      coverage_mode: gw.coverage_mode || "all",
      coverage_states: gw.coverage_states || [],
    });
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setErrorMsg("El nombre es requerido.");
      return;
    }
    if (form.origin_countries.length === 0) {
      setErrorMsg("Selecciona al menos un país de origen.");
      return;
    }
    setErrorMsg(null);
    setSaving(true);
    try {
      const payload: GatewayIn = {
        name: form.name.trim(),
        status: form.status,
        coverage_mode: form.coverage_mode,
        origin_countries: form.origin_countries,
        coverage_states: form.coverage_states,
      };
      if (editing) {
        await api.updateGateway(editing.id, payload);
      } else {
        await api.createGateway(payload);
      }
      await refreshGateways();
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
      await api.deleteGateway(deleteTarget.id);
      await refreshGateways();
      setDeleteTarget(null);
    } catch (e: any) {
      setDeleteErrorMsg(e.message || "Error al eliminar.");
    }
  };

  const toggleCountry = (id: string, checked: boolean) => {
    const current = form.origin_countries;
    setForm({
      ...form,
      origin_countries: checked ? [...current, id] : current.filter((c) => c !== id),
    });
  };

  const toggleState = (id: string, checked: boolean) => {
    const current = form.coverage_states;
    setForm({
      ...form,
      coverage_states: checked ? [...current, id] : current.filter((s) => s !== id),
    });
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        {canWrite && (
          <Button onClick={openNew}>
            <Plus size={16} className="mr-2" /> Nuevo Recolector
          </Button>
        )}
      </div>

      <Table
        data={gateways}
        keyExtractor={(r) => r.id}
        columns={[
          { header: "Nombre", accessor: "name" },
          {
            header: "Países Origen",
            accessor: (row) => {
              const names = (row.origin_countries || []).map(getCountryName);
              if (row.origin_countries?.includes("US")) {
                const mode = row.coverage_mode;
                let usCoverage = "EE. UU.";
                if (!mode || mode === "all") usCoverage = "EE. UU. (Todos los estados)";
                else if (mode === "specific")
                  usCoverage = `EE. UU. (${usStates.find((s) => s.id === row.coverage_states?.[0])?.name || row.coverage_states?.[0]})`;
                else if (mode === "only")
                  usCoverage = `EE. UU. (Solo: ${row.coverage_states?.join(", ")})`;
                else if (mode === "except")
                  usCoverage = `EE. UU. (Excepto: ${row.coverage_states?.join(", ")})`;
                return (
                  <div className="max-w-md whitespace-normal break-words">
                    {names.map((n) => (n === "Estados Unidos" ? usCoverage : n)).join(", ")}
                  </div>
                );
              }
              return <div className="max-w-md whitespace-normal break-words">{names.join(", ")}</div>;
            },
          },
          {
            header: "Estado",
            accessor: (row) => (
              <Badge variant={row.status === "active" ? "success" : "danger"}>
                {row.status === "active" ? "Activo" : "Inactivo"}
              </Badge>
            ),
          },
          {
            header: "Acciones",
            accessor: (row) => canWrite ? (
              <div className="flex space-x-2">
                <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
                  <Edit2 size={16} className="text-blue-500" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setDeleteTarget(row); setDeleteErrorMsg(null); }}>
                  <Trash2 size={16} className="text-red-500" />
                </Button>
              </div>
            ) : null,
          },
        ]}
      />

      {/* Edit / Create modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editing ? `Editar recolector — ${editing.name}` : "Nuevo recolector"}
      >
        <div className="space-y-4">
          {errorMsg && (
            <div className="bg-red-50 border-l-4 border-red-400 p-3 rounded-md flex items-start space-x-2">
              <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700">{errorMsg}</p>
            </div>
          )}

          <Input
            label="Nombre"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Países Origen</label>
            <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-md bg-white p-2 space-y-1">
              <label className="flex items-center space-x-2 p-1 hover:bg-gray-50 rounded cursor-pointer border-b border-gray-200 pb-2 mb-2">
                <input
                  type="checkbox"
                  checked={
                    form.origin_countries.length === sendCountries.length && sendCountries.length > 0
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      origin_countries: e.target.checked ? sendCountries.map((c) => c.id) : [],
                    })
                  }
                  className="rounded text-papaya-orange focus:ring-papaya-orange"
                />
                <span className="text-sm font-medium text-gray-900">Seleccionar todos</span>
              </label>
              {sendCountries.map((c) => (
                <label key={c.id} className="flex items-center space-x-2 p-1 hover:bg-gray-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.origin_countries.includes(c.id)}
                    onChange={(e) => toggleCountry(c.id, e.target.checked)}
                    className="rounded text-papaya-orange focus:ring-papaya-orange"
                  />
                  <span className="text-sm text-gray-700">{c.name}</span>
                </label>
              ))}
            </div>
          </div>

          {form.origin_countries.includes("US") && (
            <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cobertura en Estados Unidos
              </label>
              <div className="space-y-2 mb-4">
                {(["all", "specific", "only", "except"] as const).map((mode) => (
                  <label key={mode} className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="coverage_mode"
                      value={mode}
                      checked={form.coverage_mode === mode}
                      onChange={() =>
                        setForm({
                          ...form,
                          coverage_mode: mode,
                          coverage_states:
                            mode === "specific" ? (usStates[0]?.id ? [usStates[0].id] : []) : [],
                        })
                      }
                      className="text-papaya-orange focus:ring-papaya-orange"
                    />
                    <span className="text-sm text-gray-700">
                      {{ all: "Todos los estados", specific: "Un estado específico", only: "Solo estos estados", except: "Excepto estos estados" }[mode]}
                    </span>
                  </label>
                ))}
              </div>

              {form.coverage_mode === "specific" && (
                <Select
                  label="Seleccionar Estado"
                  value={form.coverage_states[0] || usStates[0]?.id || ""}
                  onChange={(e) => setForm({ ...form, coverage_states: [e.target.value] })}
                  options={usStates.map((s) => ({ value: s.id, label: `${s.name} (${s.id})` }))}
                />
              )}

              {(form.coverage_mode === "only" || form.coverage_mode === "except") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Seleccionar Estados</label>
                  <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-md bg-white p-2 space-y-1">
                    {usStates.map((s) => (
                      <label key={s.id} className="flex items-center space-x-2 p-1 hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.coverage_states.includes(s.id)}
                          onChange={(e) => toggleState(s.id, e.target.checked)}
                          className="rounded text-papaya-orange focus:ring-papaya-orange"
                        />
                        <span className="text-sm text-gray-700">{s.name} ({s.id})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <Select
            label="Estado"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            options={[
              { value: "active", label: "Activo" },
              { value: "inactive", label: "Inactivo" },
            ]}
          />

          <div className="flex justify-end space-x-3 pt-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            {canWrite && (
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Guardando..." : "Guardar"}
              </Button>
            )}
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
              ¿Eliminar el recolector{" "}
              <span className="font-semibold text-gray-900">"{deleteTarget?.name}"</span>?
              Esta acción no se puede deshacer.
            </p>
          )}
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => { setDeleteTarget(null); setDeleteErrorMsg(null); }}>
              {deleteErrorMsg ? "Cerrar" : "Cancelar"}
            </Button>
            {!deleteErrorMsg && canWrite && (
              <Button variant="danger" onClick={handleDelete}>Eliminar</Button>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
};
