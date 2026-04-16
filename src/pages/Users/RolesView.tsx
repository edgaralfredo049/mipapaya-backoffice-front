import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Save, RefreshCw, CheckSquare, Square } from "lucide-react";
import { api, BackofficeRole, BackofficePermission } from "../../api";

const PERMISSION_LABELS: Record<string, string> = {
  dashboard_ops:   "Dashboards operativos",
  dashboard_cumpl: "Dashboard cumplimiento",
  configuracion:   "Configuración",
  tasas:           "Tasas de cambio",
  clientes:        "Clientes",
  remesas:         "Remesas",
  soporte:         "Soporte / Handoff",
  usuarios:        "Usuarios y roles",
};

interface RoleState {
  /** permission_id → { read: boolean; write: boolean } */
  perms: Record<string, { read: boolean; write: boolean }>;
  saving: boolean;
  saved:  boolean;
}

function buildInitialState(
  role: BackofficeRole,
  allPermissions: BackofficePermission[],
): RoleState["perms"] {
  const map: RoleState["perms"] = {};
  for (const p of allPermissions) {
    const assigned = role.permissions.find(rp => rp.id === p.id);
    map[p.id] = {
      read:  !!assigned,
      write: !!assigned?.can_write,
    };
  }
  return map;
}

export const RolesView = () => {
  const [roles, setRoles]           = useState<BackofficeRole[]>([]);
  const [allPerms, setAllPerms]     = useState<BackofficePermission[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [roleStates, setRoleStates] = useState<Record<string, RoleState>>({});

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [r, p] = await Promise.all([api.listRoles(), api.listPermissions()]);
      setRoles(r.items);
      setAllPerms(p.items);

      const initial: Record<string, RoleState> = {};
      for (const role of r.items) {
        initial[role.id] = {
          perms:  buildInitialState(role, p.items),
          saving: false,
          saved:  false,
        };
      }
      setRoleStates(initial);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function toggleRead(roleId: string, permId: string) {
    setRoleStates(prev => {
      const current = prev[roleId].perms[permId];
      const newRead = !current.read;
      return {
        ...prev,
        [roleId]: {
          ...prev[roleId],
          saved: false,
          perms: {
            ...prev[roleId].perms,
            [permId]: {
              read:  newRead,
              write: newRead ? current.write : false, // remove write if read removed
            },
          },
        },
      };
    });
  }

  function toggleWrite(roleId: string, permId: string) {
    setRoleStates(prev => {
      const current = prev[roleId].perms[permId];
      if (!current.read) return prev; // can't have write without read
      return {
        ...prev,
        [roleId]: {
          ...prev[roleId],
          saved: false,
          perms: {
            ...prev[roleId].perms,
            [permId]: { ...current, write: !current.write },
          },
        },
      };
    });
  }

  async function handleSave(roleId: string) {
    setRoleStates(prev => ({ ...prev, [roleId]: { ...prev[roleId], saving: true } }));
    setError(null);
    try {
      const perms = roleStates[roleId].perms;
      const payload = Object.entries(perms)
        .filter(([, v]) => v.read)
        .map(([permId, v]) => ({ permission_id: permId, can_write: v.write }));

      await api.updateRolePermissions(roleId, payload);

      setRoleStates(prev => ({
        ...prev,
        [roleId]: { ...prev[roleId], saving: false, saved: true },
      }));
      setTimeout(() => {
        setRoleStates(prev => ({
          ...prev,
          [roleId]: { ...prev[roleId], saved: false },
        }));
      }, 2500);
    } catch (e: any) {
      setError(e.message);
      setRoleStates(prev => ({ ...prev, [roleId]: { ...prev[roleId], saving: false } }));
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/usuarios"
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-heading-text">Permisos por rol</h1>
            <p className="text-sm text-body-text mt-0.5">Configura qué puede ver y hacer cada rol</p>
          </div>
        </div>
        <button onClick={load} className="text-gray-400 hover:text-gray-600 transition-colors">
          <RefreshCw size={15} />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-sm text-gray-400 animate-pulse">Cargando…</div>
      ) : (
        <div className="grid gap-5">
          {roles.map(role => {
            const rs = roleStates[role.id];
            if (!rs) return null;

            return (
              <div key={role.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Role header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
                  <div>
                    <h2 className="text-sm font-semibold text-heading-text">{role.name}</h2>
                    {role.description && (
                      <p className="text-xs text-gray-400 mt-0.5">{role.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleSave(role.id)}
                    disabled={rs.saving}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      rs.saved
                        ? "bg-green-50 text-green-600 border border-green-200"
                        : "bg-papaya-orange text-white hover:bg-orange-500 disabled:opacity-50"
                    }`}
                  >
                    <Save size={12} />
                    {rs.saving ? "Guardando…" : rs.saved ? "Guardado" : "Guardar cambios"}
                  </button>
                </div>

                {/* Permissions table */}
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-6 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Permiso
                      </th>
                      <th className="px-6 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">
                        Ver
                      </th>
                      <th className="px-6 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">
                        Editar
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {allPerms.map(perm => {
                      const state = rs.perms[perm.id] ?? { read: false, write: false };
                      return (
                        <tr key={perm.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-3 text-gray-700 font-medium">
                            {PERMISSION_LABELS[perm.id] ?? perm.name}
                          </td>
                          <td className="px-6 py-3 text-center">
                            <button
                              onClick={() => toggleRead(role.id, perm.id)}
                              className={`transition-colors ${state.read ? "text-papaya-orange" : "text-gray-300 hover:text-gray-400"}`}
                              aria-label={state.read ? "Quitar acceso" : "Dar acceso"}
                            >
                              {state.read ? <CheckSquare size={17} /> : <Square size={17} />}
                            </button>
                          </td>
                          <td className="px-6 py-3 text-center">
                            <button
                              onClick={() => toggleWrite(role.id, perm.id)}
                              disabled={!state.read}
                              className={`transition-colors disabled:opacity-25 disabled:cursor-not-allowed ${
                                state.write ? "text-blue-500" : "text-gray-300 hover:text-gray-400"
                              }`}
                              aria-label={state.write ? "Quitar edición" : "Dar edición"}
                            >
                              {state.write ? <CheckSquare size={17} /> : <Square size={17} />}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
