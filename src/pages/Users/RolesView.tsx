import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Save, RefreshCw, ChevronDown, Check, Users } from "lucide-react";
import { api, BackofficeRole, BackofficePermission } from "../../api";

const PERMISSION_LABELS: Record<string, string> = {
  dashboard_ops:          "Dashboards operativos",
  dashboard_cumplimiento: "Dashboard cumplimiento",
  configuracion:          "Configuración",
  tasas:                  "Tasas de cambio",
  clientes:               "Clientes",
  remesas:                "Remesas",
  soporte:                "Soporte / Handoff",
  usuarios:               "Usuarios y roles",
};

const ROLE_ORDER = ["superusuario", "operaciones", "customer_services", "cumplimiento"];

const WRITE_ENABLED = new Set(["usuarios", "configuracion", "tasas", "remesas", "clientes"]);

const ROLE_COLORS: Record<string, string> = {
  superusuario:      "bg-papaya-orange/10 text-papaya-orange",
  operaciones:       "bg-blue-50 text-blue-600",
  customer_services: "bg-green-50 text-green-600",
  cumplimiento:      "bg-purple-50 text-purple-600",
};

interface RoleState {
  perms:  Record<string, { read: boolean; write: boolean }>;
  saving: boolean;
  saved:  boolean;
  open:   boolean;
}

function buildInitialState(role: BackofficeRole, allPerms: BackofficePermission[]): RoleState["perms"] {
  const map: RoleState["perms"] = {};
  for (const p of allPerms) {
    const assigned = role.permissions.find(rp => rp.id === p.id);
    map[p.id] = { read: !!assigned, write: !!assigned?.can_write };
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
      r.items.forEach((role, i) => {
        initial[role.id] = {
          perms:  buildInitialState(role, p.items),
          saving: false,
          saved:  false,
          open:   false,
        };
      });
      setRoleStates(initial);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function toggleOpen(roleId: string) {
    setRoleStates(prev => ({
      ...prev,
      [roleId]: { ...prev[roleId], open: !prev[roleId].open },
    }));
  }

  function toggleRead(roleId: string, permId: string) {
    setRoleStates(prev => {
      const cur = prev[roleId].perms[permId];
      const newRead = !cur.read;
      return {
        ...prev,
        [roleId]: {
          ...prev[roleId],
          saved: false,
          perms: {
            ...prev[roleId].perms,
            [permId]: { read: newRead, write: newRead ? cur.write : false },
          },
        },
      };
    });
  }

  function toggleWrite(roleId: string, permId: string) {
    setRoleStates(prev => {
      const cur = prev[roleId].perms[permId];
      if (!cur.read) return prev;
      return {
        ...prev,
        [roleId]: {
          ...prev[roleId],
          saved: false,
          perms: { ...prev[roleId].perms, [permId]: { ...cur, write: !cur.write } },
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
      setRoleStates(prev => ({ ...prev, [roleId]: { ...prev[roleId], saving: false, saved: true } }));
      setTimeout(() => {
        setRoleStates(prev => ({ ...prev, [roleId]: { ...prev[roleId], saved: false } }));
      }, 2500);
    } catch (e: any) {
      setError(e.message);
      setRoleStates(prev => ({ ...prev, [roleId]: { ...prev[roleId], saving: false } }));
    }
  }

  return (
    <div className="space-y-5 w-[70%] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/usuarios"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 px-3 py-1.5 rounded-lg shadow-sm transition-all shrink-0"
          >
            <ArrowLeft size={14} /> Usuarios
          </Link>
          <div>
            <h1 className="text-xl font-bold text-heading-text">Permisos por rol</h1>
            <p className="text-xs text-body-text mt-0.5">Configura qué puede ver y hacer cada rol</p>
          </div>
        </div>
        <button onClick={load} className="text-gray-400 hover:text-gray-600 transition-colors">
          <RefreshCw size={14} />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-xs text-red-600 flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-3">✕</button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-sm text-gray-400 animate-pulse">Cargando…</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-100">
          {[...roles].sort((a, b) => {
            const ai = ROLE_ORDER.indexOf(a.id);
            const bi = ROLE_ORDER.indexOf(b.id);
            return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
          }).map(role => {
            const rs = roleStates[role.id];
            if (!rs) return null;
            const activeCount = Object.values(rs.perms).filter(p => p.read).length;

            return (
              <div key={role.id}>
                {/* Accordion header */}
                <button
                  onClick={() => toggleOpen(role.id)}
                  className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/60 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${ROLE_COLORS[role.id] ?? "bg-gray-100 text-gray-600"}`}>
                      {role.name}
                    </span>
                    {role.description && (
                      <span className="text-xs text-gray-400 hidden sm:inline">{role.description}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">{activeCount}/{allPerms.length} permisos</span>
                    <ChevronDown
                      size={14}
                      className={`text-gray-400 transition-transform duration-200 ${rs.open ? "rotate-180" : ""}`}
                    />
                  </div>
                </button>

                {/* Accordion body */}
                {rs.open && (
                  <div className="border-t border-gray-50">
                    {/* Column headers */}
                    <div className="grid grid-cols-[1fr_64px_64px_auto] items-center px-5 py-2 bg-gray-50/80">
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Módulo</span>
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center">Ver</span>
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center">Editar</span>
                      <span className="w-24" />
                    </div>

                    {/* Permission rows */}
                    {allPerms.map(perm => {
                      const state = rs.perms[perm.id] ?? { read: false, write: false };
                      return (
                        <div
                          key={perm.id}
                          className="grid grid-cols-[1fr_64px_64px_auto] items-center px-5 py-2 hover:bg-gray-50/40 transition-colors"
                        >
                          <span className="text-xs text-gray-700">
                            {PERMISSION_LABELS[perm.id] ?? perm.name}
                          </span>

                          {/* Read toggle */}
                          <div className="flex justify-center">
                            <button
                              onClick={() => toggleRead(role.id, perm.id)}
                              className={`w-8 h-4 rounded-full transition-colors relative ${state.read ? "bg-papaya-orange" : "bg-gray-200"}`}
                              aria-label="toggle ver"
                            >
                              <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${state.read ? "left-[18px]" : "left-0.5"}`} />
                            </button>
                          </div>

                          {/* Write toggle */}
                          <div className="flex justify-center">
                            {WRITE_ENABLED.has(perm.id) ? (
                              <button
                                onClick={() => toggleWrite(role.id, perm.id)}
                                disabled={!state.read}
                                className={`w-8 h-4 rounded-full transition-colors relative disabled:opacity-30 disabled:cursor-not-allowed ${state.write ? "bg-blue-500" : "bg-gray-200"}`}
                                aria-label="toggle editar"
                              >
                                <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${state.write ? "left-[18px]" : "left-0.5"}`} />
                              </button>
                            ) : (
                              <span className="text-[10px] text-gray-300">—</span>
                            )}
                          </div>

                          <div className="w-24" />
                        </div>
                      );
                    })}

                    {/* Save row */}
                    <div className="flex justify-end px-5 py-3 border-t border-gray-50">
                      <button
                        onClick={() => handleSave(role.id)}
                        disabled={rs.saving}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          rs.saved
                            ? "bg-green-50 text-green-600 border border-green-200"
                            : "bg-papaya-orange text-white hover:bg-orange-500 disabled:opacity-50"
                        }`}
                      >
                        {rs.saved ? <Check size={11} /> : <Save size={11} />}
                        {rs.saving ? "Guardando…" : rs.saved ? "Guardado" : "Guardar"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
