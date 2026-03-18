import React, { useState, useEffect } from "react";
import { useAppStore } from "../../store/useAppStore";
import { api, GatewayIn, PagadorIn, RateIn, CommissionRow, CountryUpdateIn } from "../../api";
import { Table } from "../../components/ui/Table";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Edit2, Plus, Trash2 } from "lucide-react";
import { AlternanciaView } from "./AlternanciaView";

type Tab = "paises" | "gateways" | "pagadores" | "tarifas" | "alternancia";

const PAYMENT_METHODS = ["bank_deposit", "cash_pickup", "mobile_money", "wallet"] as const;
const METHOD_LABELS: Record<string, string> = {
  bank_deposit: "Depósito Bancario",
  cash_pickup: "Retiro en Efectivo",
  mobile_money: "Dinero Móvil",
  wallet: "Billetera Digital",
};

function generateEmptyCommissions(): CommissionRow[] {
  const rows: CommissionRow[] = [];
  for (let i = 20; i < 500; i += 10) {
    rows.push({ range_min: i, range_max: i + 10, fee: null });
  }
  return rows;
}

function mergeCommissions(
  empty: CommissionRow[],
  stored: CommissionRow[]
): CommissionRow[] {
  return empty.map((row) => {
    const match = stored.find(
      (s) => s.range_min === row.range_min && s.range_max === row.range_max
    );
    return match ? { ...row, fee: match.fee } : row;
  });
}

function buildEmptyPaymentMethods() {
  return Object.fromEntries(
    PAYMENT_METHODS.map((m) => [m, { commissions: generateEmptyCommissions() }])
  );
}

export const Config = () => {
  const { countries, currencies, states, gateways, pagadores, rates, refreshCountries, refreshGateways, refreshPagadores, refreshRates } =
    useAppStore();

  const usStates = states.filter((s) => s.country_id === "US");

  const [activeTab, setActiveTab] = useState<Tab>("paises");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deleteErrorMsg, setDeleteErrorMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (activeTab === "tarifas" && rates.length > 0) {
      const tarifa = rates[0];
      const methods = buildEmptyPaymentMethods();
      for (const m of PAYMENT_METHODS) {
        const stored = tarifa.payment_methods?.[m]?.commissions || [];
        methods[m].commissions = mergeCommissions(generateEmptyCommissions(), stored);
      }
      setFormData({ ...tarifa, payment_methods: methods });
      setEditingItem(tarifa);
      setErrorMsg(null);
    }
  }, [activeTab, rates]);

  const handleOpenModal = (item?: any) => {
    setErrorMsg(null);
    setEditingItem(item || null);

    if (item) {
      if (activeTab === "paises") {
        setFormData({ ...item });
        setIsModalOpen(true);
        return;
      }
      setFormData({ ...item });
    } else {
      if (activeTab === "gateways") {
        setFormData({
          name: "",
          origin_countries: ["US"],
          status: "active",
          coverage_mode: "all",
          coverage_states: [],
        });
      } else if (activeTab === "pagadores") {
        setFormData({ name: "", status: "active", countries: [], country_fx: {} });
      }
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    setErrorMsg(null);
    setSaving(true);
    try {
      if (activeTab === "paises") {
        const payload: CountryUpdateIn = {
          name: formData.name,
          send: !!formData.send,
          receive: !!formData.receive,
          currency_code: formData.currency_code?.trim() || null,
        };
        await api.updateCountry(editingItem.id, payload);
        await refreshCountries();
      } else if (activeTab === "gateways") {
        const payload: GatewayIn = {
          name: formData.name,
          status: formData.status,
          coverage_mode: formData.coverage_mode,
          origin_countries: formData.origin_countries || [],
          coverage_states: formData.coverage_states || [],
        };
        if (editingItem) {
          await api.updateGateway(editingItem.id, payload);
        } else {
          await api.createGateway(payload);
        }
        await refreshGateways();
      } else if (activeTab === "pagadores") {
        if (!formData.name?.trim()) { setErrorMsg("El nombre es requerido."); return; }
        if (!formData.countries || formData.countries.length === 0) {
          setErrorMsg("Debe seleccionar al menos un país destino."); return;
        }
        const payload: PagadorIn = {
          name: formData.name,
          status: formData.status,
          countries: formData.countries,
          country_fx: formData.country_fx || {},
        };
        if (editingItem) {
          await api.updatePagador(editingItem.id, payload);
        } else {
          await api.createPagador(payload);
        }
        await refreshPagadores();
      } else if (activeTab === "tarifas") {
        const paymentMethodsPayload: Record<string, { commissions: CommissionRow[] }> = {};
        for (const m of PAYMENT_METHODS) {
          const commissions = (formData.payment_methods?.[m]?.commissions || [])
            .filter((c: CommissionRow) => c.fee !== null && c.fee !== undefined && !isNaN(c.fee as number));
          paymentMethodsPayload[m] = { commissions };
        }

        const payload: RateIn = {
          name: formData.name,
          status: formData.status,
          payment_methods: paymentMethodsPayload,
        };
        await api.updateRate(formData.id, payload);
        await refreshRates();
        return;
      }
      setIsModalOpen(false);
    } catch (e: any) {
      setErrorMsg(e.message || "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setDeleteErrorMsg(null);
    try {
      if (activeTab === "gateways") {
        await api.deleteGateway(itemToDelete);
        await refreshGateways();
        setItemToDelete(null);
      } else if (activeTab === "pagadores") {
        await api.deletePagador(itemToDelete);
        await refreshPagadores();
        setItemToDelete(null);
      }
    } catch (e: any) {
      setDeleteErrorMsg(e.message || "Error al eliminar.");
    }
  };

  const getCountryName = (id: string) => countries.find((c) => c.id === id)?.name || id;

  const renderContent = () => {
    switch (activeTab) {
      case "paises":
        return (
          <Table
            data={countries}
            keyExtractor={(c) => c.id}
            columns={[
              { header: "Código", accessor: (c) => <span className="font-mono font-semibold text-gray-700">{c.id}</span> },
              { header: "País", accessor: "name" },
              {
                header: "Moneda",
                accessor: (c) =>
                  c.currency_code ? (
                    <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-sm">{c.currency_code}</span>
                  ) : (
                    <span className="text-gray-400 text-xs">—</span>
                  ),
              },
              {
                header: "Envía",
                accessor: (c) => (
                  <Badge variant={c.send ? "success" : "default"}>{c.send ? "Sí" : "No"}</Badge>
                ),
              },
              {
                header: "Recibe",
                accessor: (c) => (
                  <Badge variant={c.receive ? "success" : "default"}>{c.receive ? "Sí" : "No"}</Badge>
                ),
              },
              {
                header: "Acciones",
                accessor: (c) => (
                  <Button variant="ghost" size="sm" onClick={() => handleOpenModal(c)}>
                    <Edit2 size={16} className="text-blue-500" />
                  </Button>
                ),
              },
            ]}
          />
        );
      case "gateways":
        return (
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
                        {names
                          .map((n) => (n === "Estados Unidos" ? usCoverage : n))
                          .join(", ")}
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
                accessor: (row) => (
                  <div className="flex space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenModal(row)}>
                      <Edit2 size={16} className="text-blue-500" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setItemToDelete(row.id)}>
                      <Trash2 size={16} className="text-red-500" />
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        );

      case "pagadores":
        return (
          <Table
            data={pagadores}
            keyExtractor={(p) => p.id}
            columns={[
              { header: "Nombre", accessor: "name" },
              {
                header: "Países Destino",
                accessor: (row) => (
                  <div className="group relative inline-block">
                    <Badge variant="info" className="cursor-help">
                      {row.countries?.length || 0} países
                    </Badge>
                    <div className="absolute hidden group-hover:block z-10 w-48 p-2 mt-1 text-sm bg-gray-800 text-white rounded shadow-lg">
                      {(row.countries || []).map(getCountryName).join(", ")}
                    </div>
                  </div>
                ),
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
                accessor: (row) => (
                  <div className="flex space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenModal(row)}>
                      <Edit2 size={16} className="text-blue-500" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setItemToDelete(row.id)}>
                      <Trash2 size={16} className="text-red-500" />
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        );

      case "tarifas": {
        if (!editingItem || !formData.payment_methods) {
          return <div className="text-center py-12 text-gray-400">Cargando tarifario...</div>;
        }
        const activeMethodTab: string = formData._activeMethodTab || "bank_deposit";
        return (
          <div className="space-y-6">
            {errorMsg && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4">
                <p className="text-sm text-red-700">{errorMsg}</p>
              </div>
            )}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Comisiones por Método de Pago</h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="flex border-b border-gray-200 bg-gray-50">
                  {PAYMENT_METHODS.map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setFormData({ ...formData, _activeMethodTab: method })}
                      className={`flex-1 py-2 px-4 text-sm font-medium text-center ${
                        activeMethodTab === method
                          ? "bg-white border-b-2 border-papaya-orange text-papaya-orange"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {METHOD_LABELS[method]}
                    </button>
                  ))}
                </div>
                <div className="p-4 bg-white">
                  {PAYMENT_METHODS.filter((m) => m === activeMethodTab).map((method) => {
                    const methodData = formData.payment_methods?.[method] || { commissions: generateEmptyCommissions() };
                    const commissions: CommissionRow[] = methodData.commissions;
                    return (
                      <div key={method} className="space-y-4">
                        <div className="flex items-end space-x-2">
                          <Input
                            label="Aplicar a todos"
                            type="number"
                            placeholder="Ej. 2.50"
                            value={formData[`_applyAll_${method}`] || ""}
                            onChange={(e) => setFormData({ ...formData, [`_applyAll_${method}`]: e.target.value })}
                          />
                          <Button
                            type="button"
                            onClick={() => {
                              const val = parseFloat(formData[`_applyAll_${method}`]);
                              if (!isNaN(val) && val >= 0) {
                                setFormData({
                                  ...formData,
                                  payment_methods: {
                                    ...formData.payment_methods,
                                    [method]: { commissions: commissions.map((c) => ({ ...c, fee: val })) },
                                  },
                                });
                              }
                            }}
                          >
                            Aplicar
                          </Button>
                        </div>
                        <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md p-2 bg-gray-50">
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                            {commissions.map((c, idx) => (
                              <div key={idx} className="flex items-center justify-between bg-white p-2 rounded border border-gray-200 shadow-sm">
                                <span className="text-xs font-medium text-gray-600 w-16">${c.range_min}-${c.range_max}</span>
                                <div className="relative w-20">
                                  <span className="absolute inset-y-0 left-0 pl-2 flex items-center text-gray-500 text-xs">$</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={c.fee === null || c.fee === undefined ? "" : c.fee}
                                    onChange={(e) => {
                                      const newCommissions = [...commissions];
                                      newCommissions[idx] = { ...c, fee: e.target.value === "" ? null : parseFloat(e.target.value) };
                                      setFormData({
                                        ...formData,
                                        payment_methods: { ...formData.payment_methods, [method]: { commissions: newCommissions } },
                                      });
                                    }}
                                    className="block w-full pl-5 pr-1 py-1 text-xs rounded border-gray-300 focus:border-papaya-orange focus:ring-papaya-orange"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        );
      }

      case "alternancia":
        return <AlternanciaView />;

    }
  };

  const renderModalContent = () => {
    if (activeTab === "paises") {
      return (
        <div className="space-y-4">
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <span className="font-mono font-bold text-lg text-gray-700">{formData.id}</span>
            <span className="text-gray-500">{formData.name}</span>
          </div>
          <Input
            label="Nombre"
            value={formData.name || ""}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <Select
            label="Moneda (ISO 4217)"
            value={formData.currency_code || ""}
            onChange={(e) =>
              setFormData({ ...formData, currency_code: e.target.value || null })
            }
            options={[
              { value: "", label: "Sin moneda" },
              ...currencies.map((c) => ({ value: c.code, label: `${c.code} – ${c.name}` })),
            ]}
          />
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={!!formData.send}
                onChange={(e) => setFormData({ ...formData, send: e.target.checked })}
                className="rounded text-papaya-orange focus:ring-papaya-orange w-4 h-4"
              />
              <span className="text-sm font-medium text-gray-700">País de envío</span>
            </label>
            <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={!!formData.receive}
                onChange={(e) => setFormData({ ...formData, receive: e.target.checked })}
                className="rounded text-papaya-orange focus:ring-papaya-orange w-4 h-4"
              />
              <span className="text-sm font-medium text-gray-700">País de recepción</span>
            </label>
          </div>
        </div>
      );
    }

    if (activeTab === "gateways") {
      const sendCountries = countries.filter((c) => c.send);
      return (
        <>
          <Input
            label="Nombre"
            value={formData.name || ""}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <div className="mt-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Países Origen</label>
            <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-md bg-white p-2 space-y-1">
              <label className="flex items-center space-x-2 p-1 hover:bg-gray-50 rounded cursor-pointer border-b border-gray-200 pb-2 mb-2">
                <input
                  type="checkbox"
                  checked={
                    Array.isArray(formData.origin_countries) &&
                    formData.origin_countries.length === sendCountries.length &&
                    sendCountries.length > 0
                  }
                  onChange={(e) =>
                    setFormData({
                      ...formData,
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
                    checked={(formData.origin_countries || []).includes(c.id)}
                    onChange={(e) => {
                      const current: string[] = formData.origin_countries || [];
                      setFormData({
                        ...formData,
                        origin_countries: e.target.checked
                          ? [...current, c.id]
                          : current.filter((id) => id !== c.id),
                      });
                    }}
                    className="rounded text-papaya-orange focus:ring-papaya-orange"
                  />
                  <span className="text-sm text-gray-700">{c.name}</span>
                </label>
              ))}
            </div>
          </div>

          {(formData.origin_countries || []).includes("US") && (
            <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <label className="block text-sm font-medium text-gray-700 mb-2">Cobertura en Estados Unidos</label>
              <div className="space-y-2 mb-4">
                {(["all", "specific", "only", "except"] as const).map((mode) => (
                  <label key={mode} className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="coverage_mode"
                      value={mode}
                      checked={formData.coverage_mode === mode || (!formData.coverage_mode && mode === "all")}
                      onChange={() =>
                        setFormData({
                          ...formData,
                          coverage_mode: mode,
                          coverage_states: mode === "specific" ? (usStates[0]?.id ? [usStates[0].id] : []) : [],
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

              {formData.coverage_mode === "specific" && (
                <Select
                  label="Seleccionar Estado"
                  value={formData.coverage_states?.[0] || usStates[0]?.id || ""}
                  onChange={(e) => setFormData({ ...formData, coverage_states: [e.target.value] })}
                  options={usStates.map((s) => ({ value: s.id, label: `${s.name} (${s.id})` }))}
                />
              )}

              {(formData.coverage_mode === "only" || formData.coverage_mode === "except") && (
                <div className="mt-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Seleccionar Estados</label>
                  <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-md bg-white p-2 space-y-1">
                    {usStates.map((s) => (
                      <label key={s.id} className="flex items-center space-x-2 p-1 hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(formData.coverage_states || []).includes(s.id)}
                          onChange={(e) => {
                            const current: string[] = formData.coverage_states || [];
                            setFormData({
                              ...formData,
                              coverage_states: e.target.checked
                                ? [...current, s.id]
                                : current.filter((id) => id !== s.id),
                            });
                          }}
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
            value={formData.status || "active"}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            options={[
              { value: "active", label: "Activo" },
              { value: "inactive", label: "Inactivo" },
            ]}
          />
        </>
      );
    }

    if (activeTab === "pagadores") {
      const receiveCountries = countries.filter((c) => c.receive);

      return (
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Información General</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nombre"
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                maxLength={80}
              />
              <Select
                label="Estado"
                value={formData.status || "active"}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                options={[
                  { value: "active", label: "Activo" },
                  { value: "inactive", label: "Inactivo" },
                ]}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Países Destino y FX</h3>
            <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-md bg-white divide-y divide-gray-100">
              {receiveCountries.map((c) => {
                const isChecked = (formData.countries || []).includes(c.id);
                return (
                  <div key={c.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        const current: string[] = formData.countries || [];
                        const currentFx: Record<string, number> = formData.country_fx || {};
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            countries: [...current, c.id],
                            country_fx: { ...currentFx, [c.id]: currentFx[c.id] ?? 0 },
                          });
                        } else {
                          const newFx = { ...currentFx };
                          delete newFx[c.id];
                          setFormData({
                            ...formData,
                            countries: current.filter((id: string) => id !== c.id),
                            country_fx: newFx,
                          });
                        }
                      }}
                      className="rounded text-papaya-orange focus:ring-papaya-orange"
                    />
                    <span className="text-sm text-gray-700 flex-1">{c.name}</span>
                    {isChecked && (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0"
                          value={formData.country_fx?.[c.id] ?? 0}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              country_fx: {
                                ...(formData.country_fx || {}),
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

        </div>
      );
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "paises", label: "Países" },
    { key: "gateways", label: "Recolectores" },
    { key: "pagadores", label: "Pagadores" },
    { key: "tarifas", label: "Tarifas" },
    { key: "alternancia", label: "Alternancia" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        {activeTab !== "alternancia" && activeTab !== "paises" && activeTab !== "tarifas" && (
          <Button onClick={() => handleOpenModal()}>
            <Plus size={16} className="mr-2" /> Nuevo Registro
          </Button>
        )}
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === key
                  ? "border-papaya-orange text-papaya-orange"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {renderContent()}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? `Editar ${activeTab}` : `Nuevo ${activeTab}`}
        className={activeTab === "pagadores" ? "max-w-xl w-full" : ""}
      >
        <div className="space-y-4">
          {errorMsg && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4">
              <p className="text-sm text-red-700">{errorMsg}</p>
            </div>
          )}
          {renderModalContent()}
          <div className="flex justify-end space-x-3 mt-6">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!itemToDelete}
        onClose={() => { setItemToDelete(null); setDeleteErrorMsg(null); }}
        title="Confirmar Eliminación"
      >
        <div className="space-y-4">
          {deleteErrorMsg ? (
            <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-md">
              <p className="text-sm font-semibold text-amber-800 mb-1">No se puede eliminar</p>
              <p className="text-sm text-amber-700">{deleteErrorMsg}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              ¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer.
            </p>
          )}
          <div className="flex justify-end space-x-3 mt-6">
            <Button variant="outline" onClick={() => { setItemToDelete(null); setDeleteErrorMsg(null); }}>
              {deleteErrorMsg ? "Cerrar" : "Cancelar"}
            </Button>
            {!deleteErrorMsg && (
              <Button variant="danger" onClick={confirmDelete}>Eliminar</Button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};
