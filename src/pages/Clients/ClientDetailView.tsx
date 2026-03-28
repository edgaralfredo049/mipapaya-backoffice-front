import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ShieldCheck,
  ShieldOff,
  User,
  FileText,
  Users,
  MapPin,
  Phone,
  CreditCard,
  Save,
  Check,
  X,
  AlertTriangle,
} from "lucide-react";
import { api, ClientDetail, Beneficiary, ClientPersonalUpdate, BeneficiaryUpdateIn, AuditLogEntry } from "../../api";

const FIELD_LABELS: Record<string, string> = {
  name: "Nombre", full_name: "Nombre",
  email: "Correo",
  phone: "Teléfono",
  country: "País",
  city: "Ciudad",
  state: "Estado/Dpto.",
  address: "Dirección",
};

function fmtNY(utcStr: string) {
  return new Date(utcStr + "Z").toLocaleString("es", {
    timeZone: "America/New_York",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

const cellInput = "w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-papaya-orange focus:outline-none bg-white";

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleString("es", { dateStyle: "medium", timeStyle: "short" });
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm text-gray-800 font-medium">{value || "—"}</p>
    </div>
  );
}

function EditableField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-sm text-gray-800 font-medium bg-gray-50 border border-gray-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-papaya-orange/30 focus:border-papaya-orange transition-colors"
      />
    </div>
  );
}

function DocImage({ label, url }: { label: string; url: string | null | undefined }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
      {url ? (
        <button
          type="button"
          onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
          className="block w-full text-left cursor-zoom-in"
        >
          <img
            src={url}
            alt={label}
            className="w-full h-28 object-cover rounded-lg border border-gray-100 hover:opacity-90 transition-opacity shadow-sm"
          />
        </button>
      ) : (
        <div className="w-full h-28 rounded-lg border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-xs text-gray-300">
          Sin imagen
        </div>
      )}
    </div>
  );
}

function SectionCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-50">
        <span className="text-papaya-orange">{icon}</span>
        <h2 className="text-sm font-semibold text-heading-text">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

type PersonalForm = {
  name: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  state: string;
  address: string;
};

function toForm(p: ClientDetail["personal"], fallbackPhone: string): PersonalForm {
  return {
    name:    p.name    ?? "",
    email:   p.email   ?? "",
    phone:   p.phone   ?? fallbackPhone,
    country: p.country ?? "",
    city:    p.city    ?? "",
    state:   p.state   ?? "",
    address: p.address ?? "",
  };
}

export const ClientDetailView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<PersonalForm | null>(null);
  const [savedForm, setSavedForm] = useState<PersonalForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);

  // Beneficiary inline edit
  const [bEditingId,  setBEditingId]  = useState<string | null>(null);
  const [bEditForm,   setBEditForm]   = useState<BeneficiaryUpdateIn>({ full_name: "", city: "", address: "", phone: "" });
  const [bEditSaving, setBEditSaving] = useState(false);
  const [bEditError,  setBEditError]  = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .getClientDetail(Number(id))
      .then((c) => {
        setClient(c);
        const f = toForm(c.personal, c.phone);
        setForm(f);
        setSavedForm(f);
        return api.getClientBeneficiaries(c.phone);
      })
      .then((res) => setBeneficiaries(res.items))
      .then(() => api.getClientAuditLog(Number(id)))
      .then((log) => setAuditLog(log))
      .catch(() => setError("No se pudo cargar el cliente."))
      .finally(() => setLoading(false));
  }, [id]);

  const isDirty =
    form && savedForm
      ? (Object.keys(form) as (keyof PersonalForm)[]).some((k) => form[k] !== savedForm[k])
      : false;

  async function handleSave() {
    if (!form || !id) return;
    setSaving(true);
    setSaveError(null);
    try {
      const payload: ClientPersonalUpdate = {};
      (Object.keys(form) as (keyof PersonalForm)[]).forEach((k) => {
        if (form[k] !== savedForm![k]) payload[k] = form[k] || null;
      });
      await api.updateClientPersonal(Number(id), payload);
      setSavedForm(form);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      refreshAuditLog();
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  function setField(key: keyof PersonalForm, value: string) {
    setForm((prev) => prev ? { ...prev, [key]: value } : prev);
  }

  async function refreshAuditLog() {
    if (!id) return;
    try {
      const log = await api.getClientAuditLog(Number(id));
      setAuditLog(log);
    } catch { /* silent */ }
  }

  function startBEdit(b: Beneficiary) {
    setBEditingId(b.id);
    setBEditForm({ full_name: b.full_name, city: b.city, address: b.address, phone: b.phone });
    setBEditError(null);
  }

  function cancelBEdit() { setBEditingId(null); setBEditError(null); }

  async function saveBEdit() {
    if (!bEditingId) return;
    setBEditSaving(true);
    setBEditError(null);
    try {
      const updated = await api.updateBeneficiary(bEditingId, bEditForm);
      setBeneficiaries((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      setBEditingId(null);
      refreshAuditLog();
    } catch (e: unknown) {
      setBEditError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setBEditSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="text-sm text-gray-400 animate-pulse">Cargando…</div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-4">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 px-3.5 py-2 rounded-lg shadow-sm transition-all"
        >
          <ArrowLeft size={14} /> Volver
        </button>
        <div className="text-sm text-red-500">{error || "Cliente no encontrado."}</div>
      </div>
    );
  }

  const kycApproved = client.kyc.verification_result === "APPROVED";
  const kycResultColor = kycApproved
    ? "bg-green-light text-green-icon"
    : client.kyc.verification_result
    ? "bg-red-light text-red-icon"
    : "bg-gray-100 text-gray-400";

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 px-3.5 py-2 rounded-lg shadow-sm transition-all"
      >
        <ArrowLeft size={14} /> Volver
      </button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-papaya-orange/10 flex items-center justify-center shrink-0">
            <User size={22} className="text-papaya-orange" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-heading-text">
              {client.personal.name || client.phone}
            </h1>
            <p className="text-sm text-body-text mt-0.5">
              Cliente #{client.id} · {client.phone}
            </p>
          </div>
        </div>
        {client.kyc_valid ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-green-light text-green-icon">
            <ShieldCheck size={13} /> Verificado
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-light text-red-icon">
            <ShieldOff size={13} /> Pendiente
          </span>
        )}
      </div>

      {/* Two cards side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal info */}
        <SectionCard icon={<User size={16} />} title="Información Personal">
          {form && (
            <>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <Field label="N° Documento"   value={client.personal.doc_id} />
                <Field label="Tipo Documento" value={client.personal.id_type_label} />
                <EditableField label="Nombre"         value={form.name}    onChange={(v) => setField("name", v)} />
                <EditableField label="Correo"         value={form.email}   onChange={(v) => setField("email", v)} />
                <EditableField label="Teléfono"       value={form.phone}   onChange={(v) => setField("phone", v)} />
                <EditableField label="País"           value={form.country} onChange={(v) => setField("country", v)} />
                <EditableField label="Ciudad"         value={form.city}    onChange={(v) => setField("city", v)} />
                <EditableField label="Estado / Dpto." value={form.state}   onChange={(v) => setField("state", v)} />
              </div>
              <div className="border-t border-gray-50 mt-4 pt-4">
                <EditableField label="Dirección" value={form.address} onChange={(v) => setField("address", v)} />
              </div>
              <div className="border-t border-gray-50 mt-4 pt-4 flex items-center justify-between">
                <Field label="Fecha de registro" value={fmtDate(client.created_at)} />
                <div className="flex items-center gap-2">
                  {saveError && (
                    <span className="text-xs text-red-500">{saveError}</span>
                  )}
                  {saveSuccess && (
                    <span className="inline-flex items-center gap-1 text-xs text-green-icon">
                      <Check size={13} /> Guardado
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!isDirty || saving}
                    className="inline-flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-lg transition-all
                      bg-papaya-orange text-white shadow-sm
                      hover:bg-papaya-orange/90
                      disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                  >
                    <Save size={14} />
                    {saving ? "Guardando…" : "Guardar cambios"}
                  </button>
                </div>
              </div>
            </>
          )}
        </SectionCard>

        {/* KYC */}
        <SectionCard icon={<FileText size={16} />} title="Información KYC">
          <div className="flex items-center gap-6 mb-5">
            <div>
              <p className="text-xs text-gray-400 mb-1.5">Resultado</p>
              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${kycResultColor}`}>
                {client.kyc.verification_result || "—"}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1.5">Fecha verificación</p>
              <p className="text-sm font-medium text-gray-800">{fmtDate(client.kyc.kyc_created_at)}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <DocImage label="Frente"   url={client.kyc.document_front} />
            <DocImage label="Reverso"  url={client.kyc.document_back} />
            <DocImage label="Selfie"   url={client.kyc.selfie} />
          </div>
        </SectionCard>
      </div>

      {/* Beneficiaries */}
      <SectionCard icon={<Users size={16} />} title={`Beneficiarios (${beneficiaries.length})`}>
        {beneficiaries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Users size={32} className="text-gray-200 mb-2" />
            <p className="text-sm text-gray-400">Este cliente no tiene beneficiarios registrados</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6 -mb-6">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-gray-50 border-y border-gray-100">
                  <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nombre</th>
                  <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <span className="flex items-center gap-1.5"><CreditCard size={12} />Cédula</span>
                  </th>
                  <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <span className="flex items-center gap-1.5"><Phone size={12} />Teléfono</span>
                  </th>
                  <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <span className="flex items-center gap-1.5"><MapPin size={12} />Ciudad</span>
                  </th>
                  <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Dirección</th>
                  <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Registro</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {beneficiaries.map((b) => {
                  const isEditing = bEditingId === b.id;
                  if (isEditing) {
                    return (
                      <React.Fragment key={b.id}>
                        <tr className="bg-yellow-50/50">
                          <td className="px-3 py-2">
                            <input value={bEditForm.full_name} onChange={(e) => setBEditForm((p) => ({ ...p, full_name: e.target.value }))} className={cellInput} />
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{b.cedula}</td>
                          <td className="px-3 py-2">
                            <input value={bEditForm.phone} onChange={(e) => setBEditForm((p) => ({ ...p, phone: e.target.value }))} className={cellInput} />
                          </td>
                          <td className="px-3 py-2">
                            <input value={bEditForm.city} onChange={(e) => setBEditForm((p) => ({ ...p, city: e.target.value }))} className={cellInput} />
                          </td>
                          <td className="px-3 py-2">
                            <input value={bEditForm.address} onChange={(e) => setBEditForm((p) => ({ ...p, address: e.target.value }))} className={cellInput} />
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-400 whitespace-nowrap">{fmtDate(b.created_at)}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1">
                              <button onClick={saveBEdit} disabled={bEditSaving}
                                className="p-1.5 rounded hover:bg-green-100 text-green-600 disabled:opacity-40 transition-colors" title="Guardar">
                                <Check size={14} />
                              </button>
                              <button onClick={cancelBEdit}
                                className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title="Cancelar">
                                <X size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {bEditError && (
                          <tr className="bg-red-50">
                            <td colSpan={7} className="px-4 py-2 text-xs text-red-700">
                              <AlertTriangle size={12} className="inline mr-1 text-red-500" />{bEditError}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  }
                  return (
                    <tr key={b.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-3 py-3 font-medium text-gray-800 whitespace-nowrap">{b.full_name}</td>
                      <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{b.cedula}</td>
                      <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{b.phone}</td>
                      <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{b.city}</td>
                      <td className="px-3 py-3 text-gray-600">{b.address}</td>
                      <td className="px-3 py-3 text-gray-400 whitespace-nowrap text-xs">{fmtDate(b.created_at)}</td>
                      <td className="px-3 py-3">
                        <button onClick={() => startBEdit(b)}
                          className="p-1.5 rounded hover:bg-blue-50 text-blue-500 hover:text-blue-700 transition-colors" title="Editar">
                          ✎
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Audit log */}
      <SectionCard icon={<FileText size={16} />} title="Historial de modificaciones">
        {auditLog.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <FileText size={32} className="text-gray-200 mb-2" />
            <p className="text-sm text-gray-400">Sin modificaciones registradas</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6 -mb-6">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-gray-50 border-y border-gray-100">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Fecha (New York)</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Usuario</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Entidad</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cambios</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {auditLog.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50/60 transition-colors align-top">
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{fmtNY(entry.created_at)}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{entry.user}</td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {entry.entity_type === "client" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                          <User size={10} /> Cliente
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium">
                          <Users size={10} /> {entry.entity_label || "Beneficiario"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ul className="space-y-0.5">
                        {Object.entries(entry.changes).map(([field, { from, to }]) => (
                          <li key={field} className="text-xs text-gray-700">
                            <span className="font-medium text-gray-500">{FIELD_LABELS[field] ?? field}:</span>{" "}
                            <span className="text-gray-400 line-through">{from ?? "—"}</span>
                            {" → "}
                            <span className="text-gray-800 font-medium">{to ?? "—"}</span>
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
};
