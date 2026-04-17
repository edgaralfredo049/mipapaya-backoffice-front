import React, { useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { useAuthStore } from "../../store/useAuthStore";
import { api, Country, CountryUpdateIn } from "../../api";
import { Table } from "../../components/ui/Table";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Edit2, AlertTriangle } from "lucide-react";

type PaisForm = {
  id: string;
  name: string;
  currency_code: string | null;
  send: boolean;
  receive: boolean;
};

export const PaisesTab = () => {
  const { countries, currencies, refreshCountries } = useAppStore();
  const canWrite = useAuthStore(s => s.hasPermission("configuracion", true));
  const [editing, setEditing] = useState<PaisForm | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const openEdit = (c: Country) => {
    setEditing({ id: c.id, name: c.name, currency_code: c.currency_code, send: c.send, receive: c.receive });
    setErrorMsg(null);
  };

  const handleSave = async () => {
    if (!editing) return;
    setErrorMsg(null);
    setSaving(true);
    try {
      const payload: CountryUpdateIn = {
        name: editing.name,
        send: editing.send,
        receive: editing.receive,
        currency_code: editing.currency_code?.trim() || null,
      };
      await api.updateCountry(editing.id, payload);
      await refreshCountries();
      setEditing(null);
    } catch (e: any) {
      setErrorMsg(e.message || "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Table
        data={countries}
        keyExtractor={(c) => c.id}
        columns={[
          {
            header: "Código",
            accessor: (c) => (
              <span className="font-mono font-semibold text-gray-700">{c.id}</span>
            ),
          },
          { header: "País", accessor: "name" },
          {
            header: "Moneda",
            accessor: (c) =>
              c.currency_code ? (
                <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-sm">
                  {c.currency_code}
                </span>
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
            accessor: (c) => canWrite ? (
              <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                <Edit2 size={16} className="text-blue-500" />
              </Button>
            ) : null,
          },
        ]}
      />

      <Modal
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        title={editing ? `Editar país — ${editing.name}` : ""}
      >
        {editing && (
          <div className="space-y-4">
            {errorMsg && (
              <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-md flex items-start space-x-2">
                <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-700">{errorMsg}</p>
              </div>
            )}
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <span className="font-mono font-bold text-lg text-gray-700">{editing.id}</span>
              <span className="text-gray-500">{editing.name}</span>
            </div>
            <Input
              label="Nombre"
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
            />
            <Select
              label="Moneda (ISO 4217)"
              value={editing.currency_code || ""}
              onChange={(e) =>
                setEditing({ ...editing, currency_code: e.target.value || null })
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
                  checked={editing.send}
                  onChange={(e) => setEditing({ ...editing, send: e.target.checked })}
                  className="rounded text-papaya-orange focus:ring-papaya-orange w-4 h-4"
                />
                <span className="text-sm font-medium text-gray-700">País de envío</span>
              </label>
              <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={editing.receive}
                  onChange={(e) => setEditing({ ...editing, receive: e.target.checked })}
                  className="rounded text-papaya-orange focus:ring-papaya-orange w-4 h-4"
                />
                <span className="text-sm font-medium text-gray-700">País de recepción</span>
              </label>
            </div>
            <div className="flex justify-end space-x-3 pt-2">
              <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
              {canWrite && (
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Guardando..." : "Guardar"}
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};
