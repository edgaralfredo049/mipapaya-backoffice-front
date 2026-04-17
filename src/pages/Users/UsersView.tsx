import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { UserPlus, UserCheck, UserX, Settings2, RefreshCw, KeyRound } from "lucide-react";
import { api, BackofficeUser, BackofficeRole } from "../../api";

const ROLE_LABELS: Record<string, string> = {
  superusuario:      "Superusuario",
  operaciones:       "Operaciones",
  customer_services: "Customer Services",
  cumplimiento:      "Cumplimiento",
};

const ROLE_COLORS: Record<string, string> = {
  superusuario:      "bg-papaya-orange/10 text-papaya-orange",
  operaciones:       "bg-blue-50 text-blue-700",
  customer_services: "bg-green-50 text-green-700",
  cumplimiento:      "bg-purple-50 text-purple-700",
};

export const UsersView = () => {
  const [users, setUsers]   = useState<BackofficeUser[]>([]);
  const [roles, setRoles]   = useState<BackofficeRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Formulario nuevo usuario
  const [form, setForm] = useState({ email: "", name: "", role_id: "" });

  async function load() {
    setLoading(true);
    try {
      const [u, r] = await Promise.all([api.listBackofficeUsers(), api.listRoles()]);
      setUsers(u.items);
      setRoles(r.items);
      if (!form.role_id && r.items.length > 0) {
        setForm(f => ({ ...f, role_id: r.items[0].id }));
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.createBackofficeUser(form);
      setSuccess(`Usuario ${form.email} creado. Se envió un email con contraseña temporal.`);
      setShowModal(false);
      setForm({ email: "", name: "", role_id: roles[0]?.id ?? "" });
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(user: BackofficeUser) {
    try {
      await api.updateBackofficeUser(user.id, { active: !user.active });
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleChangeRole(user: BackofficeUser, newRoleId: string) {
    if (newRoleId === user.role_id) return;
    try {
      await api.updateBackofficeUser(user.id, { role_id: newRoleId });
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleResetPassword(user: BackofficeUser) {
    try {
      await api.resetUserPassword(user.id);
      setSuccess(`Se reenvió el email de acceso a ${user.email}.`);
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-heading-text">Usuarios del Backoffice</h1>
          <p className="text-sm text-body-text mt-0.5">Gestión de acceso y roles</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/usuarios/roles"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Settings2 size={15} /> Permisos por rol
          </Link>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-papaya-orange text-white text-sm font-medium hover:bg-orange-500 transition-colors"
          >
            <UserPlus size={15} /> Crear usuario
          </button>
        </div>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 flex items-center justify-between">
          {success}
          <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700">✕</button>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
          <h2 className="text-sm font-semibold text-heading-text">
            {users.length} usuario{users.length !== 1 ? "s" : ""}
          </h2>
          <button onClick={load} className="text-gray-400 hover:text-gray-600 transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-sm text-gray-400 animate-pulse">Cargando…</div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400">Sin usuarios creados</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Usuario</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Rol</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Creado</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-800">{user.name || "—"}</p>
                    <p className="text-xs text-gray-400">{user.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={user.role_id}
                      onChange={e => handleChangeRole(user, e.target.value)}
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-papaya-orange/30 ${ROLE_COLORS[user.role_id] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {roles.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${user.active ? "text-green-600" : "text-gray-400"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${user.active ? "bg-green-500" : "bg-gray-300"}`} />
                      {user.active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-400">
                    {new Date(user.created_at).toLocaleDateString("es")}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleResetPassword(user)}
                        className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                        title="Reenviar email con contraseña temporal"
                      >
                        <KeyRound size={13} /> Reset
                      </button>
                      <button
                        onClick={() => handleToggleActive(user)}
                        className={`inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                          user.active
                            ? "border-red-200 text-red-500 hover:bg-red-50"
                            : "border-green-200 text-green-600 hover:bg-green-50"
                        }`}
                      >
                        {user.active ? <><UserX size={13} /> Desactivar</> : <><UserCheck size={13} /> Activar</>}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal crear usuario */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
            <h2 className="text-lg font-bold text-heading-text">Crear usuario</h2>
            <p className="text-sm text-gray-500 -mt-3">
              Cognito enviará un email con la contraseña temporal al nuevo usuario.
            </p>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Nombre</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:border-papaya-orange focus:outline-none"
                  placeholder="Nombre completo"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:border-papaya-orange focus:outline-none"
                  placeholder="usuario@mipapaya.io"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Rol</label>
                <select
                  value={form.role_id}
                  onChange={e => setForm(f => ({ ...f, role_id: e.target.value }))}
                  className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:border-papaya-orange focus:outline-none bg-white"
                >
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              {error && (
                <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setError(null); }}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-papaya-orange text-white text-xs font-medium hover:bg-orange-500 disabled:opacity-50"
                >
                  {saving ? "Creando…" : "Crear y enviar email"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
