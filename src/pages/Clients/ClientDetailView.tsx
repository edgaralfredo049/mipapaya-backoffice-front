import React, { useState, useEffect, useRef } from "react";
import { useAuthStore } from "../../store/useAuthStore";
import { createPortal } from "react-dom";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  ShieldCheck,
  ShieldOff,
  User,
  FileText,
  AlertOctagon,
  TrendingUp,
  CheckCircle2,
  Info,
  Users,
  MapPin,
  Phone,
  CreditCard,
  Save,
  Check,
  X,
  AlertTriangle,
  Pencil,
  ChevronDown,
  ArrowLeftRight,
  Receipt,
  HelpCircle,
  MessageSquare,
  Upload,
  Trash2,
  FilePlus,
  FileImage,
} from "lucide-react";
import { api, ClientDetail, Beneficiary, ClientPersonalUpdate, BeneficiaryUpdateIn, AuditLogEntry, ClientTxStatRow, RemittanceRecord, HandoffRequest, HandoffMessage, ClientDocument, ClientRule } from "../../api";
import { InteractionsSection } from "../../components/InteractionsSection";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";
import { Pagination } from "../../components/ui/Pagination";

const REM_STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente", transmited: "Transmitida",
  unpayed: "No Pagada", payed: "Pagada", canceled: "Cancelada",
};
const REM_STATUS_COLORS: Record<string, string> = {
  pending:    "bg-yellow-50 text-yellow-700",
  transmited: "bg-blue-50 text-blue-700",
  unpayed:    "bg-red-50 text-red-600",
  payed:      "bg-green-50 text-green-700",
  canceled:   "bg-gray-100 text-gray-500",
};

const FIELD_LABELS: Record<string, string> = {
  name: "Nombre", full_name: "Nombre",
  email: "Correo",
  phone: "Teléfono",
  country: "País",
  city: "Ciudad",
  state: "Estado/Dpto.",
  address: "Dirección",
  active: "Estado cuenta",
};

function fmtFieldValue(field: string, value: string | null | boolean): string {
  if (field === "active") return value === true || value === "true" ? "Activa" : "Desactivada";
  return value == null ? "—" : String(value);
}

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
  editing,
  onToggleEdit,
  type = "text",
  showEdit = true,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  editing: boolean;
  onToggleEdit: () => void;
  type?: "text" | "date";
  showEdit?: boolean;
}) {
  const displayValue =
    type === "date" && !editing && value
      ? new Date(value + "T00:00:00").toLocaleDateString("es", { day: "2-digit", month: "short", year: "numeric" })
      : value;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-gray-400">{label}</p>
        {showEdit && (
          <button
            type="button"
            onClick={onToggleEdit}
            className={`p-0.5 rounded transition-colors ${editing ? "text-papaya-orange" : "text-gray-300 hover:text-gray-500"}`}
            title={editing ? "Bloquear campo" : "Editar campo"}
          >
            <Pencil size={11} />
          </button>
        )}
      </div>
      <input
        type={editing && type === "date" ? "date" : "text"}
        value={displayValue}
        readOnly={!editing}
        onChange={(e) => editing && onChange(e.target.value)}
        className={`w-full text-sm font-medium rounded-md px-2.5 py-1.5 transition-colors focus:outline-none ${
          editing
            ? "text-gray-800 bg-white border border-papaya-orange focus:ring-2 focus:ring-papaya-orange/30"
            : "text-gray-800 bg-gray-50 border border-gray-200 cursor-default select-none"
        }`}
      />
    </div>
  );
}

// ─── Image Lightbox (portal — escapes stacking contexts) ─────────────────────

function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <img
        src={src}
        alt={alt}
        className="max-w-full max-h-[90vh] rounded-xl shadow-2xl object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body
  );
}

// ─── Blob URL cache (session-scoped) ─────────────────────────────────────────
const _blobCache = new Map<number, string>();

async function getBlobUrl(clientId: number, docId: number): Promise<string> {
  if (_blobCache.has(docId)) return _blobCache.get(docId)!;
  const blob = await api.fetchDocumentBlob(clientId, docId);
  const url  = URL.createObjectURL(blob);
  _blobCache.set(docId, url);
  return url;
}

// ─── Document Thumbnail ──────────────────────────────────────────────────────

function DocThumb({ clientId, doc }: { clientId: number; doc: ClientDocument }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!doc.mime_type.startsWith("image/")) return;
    getBlobUrl(clientId, doc.id).then(setSrc).catch(() => {});
  }, [clientId, doc.id, doc.mime_type]);

  if (src) {
    return <img src={src} alt={doc.name} className="w-full h-full object-cover" />;
  }
  return doc.mime_type.startsWith("image/")
    ? <FileImage size={28} className="text-gray-300" />
    : <FileText  size={28} className="text-gray-300" />;
}

const DOC_STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  APPROVED: { bg: "bg-green-100", text: "text-green-700", label: "Aprobado" },
  PENDING:  { bg: "bg-yellow-100", text: "text-yellow-700", label: "Pendiente" },
  REJECTED: { bg: "bg-red-100",   text: "text-red-600",   label: "Rechazado" },
};

function DocValidationModal({ clientId, doc, onClose, onStatusChange }: { clientId: number; doc: ClientDocument; onClose: () => void; onStatusChange?: (updated: ClientDocument) => void }) {
  const { user } = useAuthStore();
  const [blobUrl, setBlobUrl]       = useState<string | null>(null);
  const [saving, setSaving]         = useState<"APPROVED" | "REJECTED" | null>(null);
  const [current, setCurrent]       = useState<ClientDocument>(doc);
  const status = current.validation_status ?? "APPROVED";
  const style  = DOC_STATUS_STYLES[status] ?? DOC_STATUS_STYLES.APPROVED;
  const summaryParts = current.validation_summary
    ? doc.validation_summary.split(" | ").map((p) => {
        const [label, ...rest] = p.split(": ");
        let value = rest.join(": ");
        let valid: boolean | null = null;
        if (value.endsWith(":ok"))   { valid = true;  value = value.slice(0, -3); }
        else if (value.endsWith(":fail")) { valid = false; value = value.slice(0, -5); }
        else if (status === "APPROVED")   { valid = true; }
        return { label, value, valid };
      })
    : [];

  useEffect(() => {
    if (current.mime_type.startsWith("image/")) {
      getBlobUrl(clientId, current.id).then(setBlobUrl).catch(() => {});
    }
  }, [clientId, current.id, current.mime_type]);

  async function changeStatus(newStatus: "APPROVED" | "REJECTED") {
    setSaving(newStatus);
    try {
      const updated = await api.updateDocumentStatus(clientId, current.id, newStatus, user?.email ?? "admin@mipapaya.com");
      setCurrent(updated);
      onStatusChange?.(updated);
    } catch {
      // noop
    } finally {
      setSaving(null);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-papaya-orange" />
            <span className="text-sm font-semibold text-heading-text truncate max-w-[220px]">{doc.document_type || doc.name}</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"><X size={16} /></button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Status badge + actions */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}>
                {style.label}
              </span>
              <span className="text-xs text-gray-400">{new Date(current.created_at).toLocaleString("es", { dateStyle: "medium", timeStyle: "short" })}</span>
            </div>
            {status === "PENDING" && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => changeStatus("APPROVED")}
                  disabled={!!saving}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50 transition-colors"
                >
                  <CheckCircle2 size={12} />
                  {saving === "APPROVED" ? "..." : "Aprobar"}
                </button>
                <button
                  onClick={() => changeStatus("REJECTED")}
                  disabled={!!saving}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors"
                >
                  <X size={12} />
                  {saving === "REJECTED" ? "..." : "Rechazar"}
                </button>
              </div>
            )}
          </div>

          {/* Document preview */}
          {blobUrl ? (
            <img src={blobUrl} alt={current.name} className="w-full max-h-52 object-contain rounded-xl border border-gray-100 bg-gray-50" />
          ) : (
            <div className="w-full h-32 rounded-xl border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center gap-2 text-gray-300">
              <FileText size={22} />
              <span className="text-xs">{current.name}</span>
            </div>
          )}

          {/* Summary */}
          {summaryParts.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Resultado del análisis</p>
              <div className="rounded-xl border border-gray-100 bg-gray-50 divide-y divide-gray-100 overflow-hidden">
                {summaryParts.map(({ label, value, valid }) => (
                  <div key={label} className="flex items-center justify-between px-3 py-2 gap-3">
                    <span className="text-xs text-gray-400 shrink-0">{label}</span>
                    <div className="flex items-center gap-1.5 ml-auto min-w-0">
                      <span className="text-xs font-medium text-gray-800 text-right">{value}</span>
                      {valid === true  && <CheckCircle2 size={13} className="text-green-500 shrink-0" />}
                      {valid === false && <X            size={13} className="text-red-500   shrink-0" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!summaryParts.length && (
            <p className="text-xs text-gray-400 text-center py-2">Sin resumen de análisis disponible</p>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Client Documents Upload ─────────────────────────────────────────────────

function ClientDocumentsSection({ clientId }: { clientId: number }) {
  const [docs, setDocs]               = useState<ClientDocument[]>([]);
  const [uploading, setUploading]     = useState(false);
  const [rules, setRules]             = useState<ClientRule[]>([]);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [selectedType, setSelectedType]   = useState<string>("");
  const [detailDoc, setDetailDoc]         = useState<ClientDocument | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getClientDocuments(clientId).then(setDocs).catch(() => {});
    api.getClientRules().then(setRules).catch(() => {});
  }, [clientId]);

  const uploadedTypes = new Set(docs.map((d) => d.document_type).filter(Boolean) as string[]);
  const availableRules = rules.filter((r) => r.active && !uploadedTypes.has(r.document_description));

  function requestUpload() {
    if (availableRules.length > 0) {
      setSelectedType(availableRules[0].document_description);
      setShowTypeModal(true);
    } else {
      setSelectedType("");
      inputRef.current?.click();
    }
  }

  function confirmTypeAndPickFile() {
    setShowTypeModal(false);
    inputRef.current?.click();
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    const errors: string[] = [];
    for (const file of Array.from(files)) {
      try {
        const doc = await api.uploadClientDocument(clientId, file, selectedType || undefined);
        setDocs((prev) => [doc, ...prev]);
      } catch (err: any) {
        const detail = err?.response?.data?.detail || err?.message || "Error desconocido";
        errors.push(`${file.name}: ${detail}`);
      }
    }
    setUploading(false);
    setSelectedType("");
    if (errors.length > 0) {
      alert(`No se pudieron subir ${errors.length} archivo(s):\n${errors.join("\n")}`);
    }
  }

  async function handleDelete(e: React.MouseEvent, doc: ClientDocument) {
    e.stopPropagation();
    await api.deleteClientDocument(clientId, doc.id).catch(() => {});
    _blobCache.delete(doc.id);
    setDocs((prev) => prev.filter((d) => d.id !== doc.id));
  }

  return (
    <div className="mt-3 border-t border-gray-50 pt-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Documentos requeridos en reglas</p>
        <button
          type="button"
          onClick={requestUpload}
          disabled={uploading}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-papaya-orange text-white hover:bg-papaya-orange/90 disabled:opacity-40 transition-colors"
        >
          <Upload size={11} />
          {uploading ? "Cargando…" : "Subir"}
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,application/pdf"
          className="sr-only"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {docs.length === 0 && !uploading ? (
        <button
          type="button"
          onClick={requestUpload}
          className="w-full border-2 border-dashed border-gray-200 rounded-lg py-6 flex flex-col items-center gap-2 text-gray-300 hover:border-papaya-orange/40 hover:text-papaya-orange/50 transition-colors"
        >
          <FilePlus size={22} />
          <span className="text-xs">Arrastra archivos o haz click para subir</span>
        </button>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:h-1">
          {docs.map((doc) => {
            const status = doc.validation_status ?? "APPROVED";
            const style  = DOC_STATUS_STYLES[status] ?? DOC_STATUS_STYLES.APPROVED;
            return (
              <div key={doc.id} className="relative group shrink-0 w-20">
                <button
                  type="button"
                  onClick={() => setDetailDoc(doc)}
                  className="w-20 h-20 rounded-lg border border-gray-100 overflow-hidden bg-gray-50 hover:border-papaya-orange/40 transition-colors cursor-pointer flex items-center justify-center"
                >
                  <DocThumb clientId={clientId} doc={doc} />
                </button>
                {/* Validation status badge */}
                <span className={`absolute top-1 left-1 text-[8px] font-bold px-1 py-0.5 rounded ${style.bg} ${style.text} leading-none`}>
                  {style.label}
                </span>
                {doc.document_type && (
                  <p className="mt-0.5 text-[9px] font-semibold text-papaya-orange truncate text-center leading-tight px-0.5">
                    {doc.document_type}
                  </p>
                )}
                <p className="mt-0.5 text-[10px] text-gray-400 truncate text-center leading-tight">{doc.name}</p>
                <button
                  type="button"
                  onClick={(e) => handleDelete(e, doc)}
                  className="absolute top-1 right-1 p-0.5 rounded-md bg-white/80 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail modal with image + summary */}
      {detailDoc && (
        <DocValidationModal
          clientId={clientId}
          doc={detailDoc}
          onClose={() => setDetailDoc(null)}
          onStatusChange={(updated) => setDocs((prev) => prev.map((d) => d.id === updated.id ? updated : d))}
        />
      )}

      {/* Document type selection modal */}
      {showTypeModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="bg-orange-50 border-b border-orange-100 px-5 py-4 flex items-center gap-3">
              <FileText size={18} className="text-papaya-orange shrink-0" />
              <h3 className="font-semibold text-gray-800 text-sm">Tipo de documento</h3>
            </div>
            <div className="px-5 py-4 flex flex-col gap-3">
              <p className="text-xs text-gray-500">Selecciona el tipo de documento que vas a subir.</p>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-papaya-orange/30"
              >
                {availableRules.map((r) => (
                  <option key={r.id} value={r.document_description}>{r.document_description}</option>
                ))}
              </select>
            </div>
            <div className="px-5 pb-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={confirmTypeAndPickFile}
                className="w-full bg-papaya-orange text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-papaya-orange/90 transition-colors"
              >
                Seleccionar archivo
              </button>
              <button
                type="button"
                onClick={() => setShowTypeModal(false)}
                className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function DocImage({ label, url }: { label: string; url: string | null | undefined }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
      {url ? (
        <>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="block w-full text-left cursor-zoom-in"
          >
            <img
              src={url}
              alt={label}
              className="w-full h-28 object-cover rounded-lg border border-gray-100 hover:opacity-90 transition-opacity shadow-sm"
            />
          </button>
          {open && <ImageLightbox src={url} alt={label} onClose={() => setOpen(false)} />}
        </>
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
  collapsible = false,
  defaultOpen = true,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div
        className={`flex items-center gap-2.5 px-6 py-4 border-b border-gray-50 ${collapsible ? "cursor-pointer select-none hover:bg-gray-50/60 transition-colors" : ""}`}
        onClick={collapsible ? () => setOpen((v) => !v) : undefined}
      >
        <span className="text-papaya-orange">{icon}</span>
        <h2 className="text-sm font-semibold text-heading-text flex-1">{title}</h2>
        {collapsible && (
          <ChevronDown
            size={16}
            className={`text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : "rotate-0"}`}
          />
        )}
      </div>
      {(!collapsible || open) && <div className="p-6">{children}</div>}
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
  postal_code: string;
  birth_date: string;
  occupation: string;
};

function toForm(p: ClientDetail["personal"], fallbackPhone: string): PersonalForm {
  return {
    name:    p.name    ?? "",
    email:   p.email   ?? "",
    phone:   p.phone   ?? fallbackPhone,
    country: p.country ?? "",
    city:        p.city        ?? "",
    state:       p.state       ?? "",
    address:     p.address     ?? "",
    postal_code: p.postal_code ?? "",
    birth_date:  p.birth_date  ?? "",
    occupation:  p.occupation  ?? "",
  };
}

export const ClientDetailView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const canWrite = useAuthStore(s => s.hasPermission("clientes", true));
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<PersonalForm | null>(null);
  const [savedForm, setSavedForm] = useState<PersonalForm | null>(null);
  const [editingFields, setEditingFields] = useState<Set<keyof PersonalForm>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [txStats, setTxStats] = useState<ClientTxStatRow[]>([]);

  const B_PAGE_SIZE = 5;
  const [bPage, setBPage] = useState(1);
  const AUDIT_PAGE_SIZE = 8;
  const [auditPage, setAuditPage] = useState(1);

  const REM_PAGE_SIZE = 10;
  const [remittances, setRemittances] = useState<RemittanceRecord[]>([]);
  const [remTotal, setRemTotal] = useState(0);
  const [remPage, setRemPage] = useState(1);
  const [remLoading, setRemLoading] = useState(false);
  const [handoffs, setHandoffs]         = useState<HandoffRequest[]>([]);
  const [handoffLoading, setHandoffLoading] = useState(false);
  const [showHandoffChat, setShowHandoffChat] = useState(false);
  const [handoffChatMessages, setHandoffChatMessages] = useState<HandoffMessage[]>([]);
  const [handoffChatLoading, setHandoffChatLoading] = useState(false);
  const handoffChatScrollRef = useRef<HTMLDivElement>(null);

  const [activeStatus, setActiveStatus] = useState<boolean>(true);
  const [togglingActive, setTogglingActive] = useState(false);
  const [showActiveModal, setShowActiveModal] = useState(false);
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [dataTab, setDataTab] = useState<"remesas" | "beneficiarios" | "soporte" | "historial" | "interacciones">("remesas");
  const [leftTab, setLeftTab] = useState<"kyc" | "personal">("kyc");

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
        setActiveStatus(c.active ?? true);
        const f = toForm(c.personal, c.phone);
        setForm(f);
        setSavedForm(f);
        return api.getClientBeneficiaries(c.phone);
      })
      .then((res) => setBeneficiaries(res.items))
      .then(() => api.getClientAuditLog(Number(id)))
      .then((log) => setAuditLog(log))
      .then(() => api.getClientTxStats(Number(id)))
      .then((res) => setTxStats(res.items))
      .catch(() => setError("No se pudo cargar el cliente."))
      .finally(() => setLoading(false));
  }, [id]);

  // Load handoff requests for this client (by phone)
  useEffect(() => {
    if (!client?.phone) return;
    setHandoffLoading(true);
    api.getHandoffRequests({ search: client.phone, limit: 50 })
      .then(res => setHandoffs(res.items))
      .catch(() => {})
      .finally(() => setHandoffLoading(false));
  }, [client?.phone]);

  useEffect(() => {
    const anyModal = showHandoffChat || showRiskModal || showActiveModal;
    document.body.style.overflow = anyModal ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [showHandoffChat, showRiskModal, showActiveModal]);

  async function openHandoffChat(handoffId: string) {
    setHandoffChatMessages([]);
    setShowHandoffChat(true);
    setHandoffChatLoading(true);
    try {
      const res = await api.getHandoffMessages(handoffId);
      setHandoffChatMessages(res.messages);
      setTimeout(() => { handoffChatScrollRef.current?.scrollTo({ top: handoffChatScrollRef.current.scrollHeight }); }, 50);
    } catch { /* silent */ } finally {
      setHandoffChatLoading(false);
    }
  }

  useEffect(() => {
    if (!client) return;
    setRemLoading(true);
    api.getRemittances({ client_id: client.phone, page: remPage })
      .then((res) => { setRemittances(res.items); setRemTotal(res.total); })
      .catch(() => {})
      .finally(() => setRemLoading(false));
  }, [client, remPage]);

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
      setEditingFields(new Set());
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

  function toggleFieldEdit(key: keyof PersonalForm) {
    setEditingFields((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  async function confirmToggleActive() {
    if (!id || togglingActive) return;
    setShowActiveModal(false);
    setTogglingActive(true);
    try {
      const res = await api.setClientActive(Number(id), !activeStatus);
      setActiveStatus(res.active);
      refreshAuditLog();
    } catch { /* silent */ } finally {
      setTogglingActive(false);
    }
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
    <div className="p-5 max-w-7xl mx-auto space-y-4">
      {/* Header — back + identity + actions in one row */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 px-3 py-1.5 rounded-lg shadow-sm transition-all shrink-0"
        >
          <ArrowLeft size={14} /> Volver
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-full bg-papaya-orange/10 flex items-center justify-center shrink-0">
            <User size={18} className="text-papaya-orange" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-heading-text truncate leading-tight">
              {client.personal.name || client.phone}
            </h1>
            <p className="text-xs text-body-text">
              Cliente #{client.id} · {client.phone}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowRiskModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-papaya-orange text-white hover:bg-papaya-orange/90 transition-colors"
          >
            <AlertOctagon size={12} /> Nivel de riesgo
          </button>
          {client.kyc_valid ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold bg-green-light text-green-icon">
              <ShieldCheck size={12} /> Verificado
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold bg-red-light text-red-icon">
              <ShieldOff size={12} /> Pendiente
            </span>
          )}
          <button
            type="button"
            onClick={() => setShowActiveModal(true)}
            disabled={togglingActive}
            className={`inline-flex items-center gap-1.5 text-xs font-medium transition-all disabled:opacity-50 ${activeStatus ? "text-green-icon" : "text-gray-400"}`}
          >
            <span className={`relative inline-flex items-center w-8 h-4 rounded-full transition-colors shrink-0 ${activeStatus ? "bg-green-icon/80" : "bg-gray-300"}`}>
              <span className={`absolute w-3 h-3 bg-white rounded-full shadow transition-all ${activeStatus ? "left-[17px]" : "left-[2px]"}`} />
            </span>
            {activeStatus ? "Activa" : "Inactiva"}
          </button>
        </div>
      </div>

      {/* Two-column master-detail layout */}
      <div className="flex gap-4 items-start">

        {/* Left sidebar — sticky, tabbed */}
        <div className="w-96 shrink-0 sticky top-5">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Tab bar */}
            <div className="flex items-center gap-0.5 px-4 pt-3 border-b border-gray-100">
              {([
                { key: "kyc",      icon: <FileText size={13} />, label: "KYC" },
                { key: "personal", icon: <User size={13} />,     label: "Información Personal" },
              ] as { key: typeof leftTab; icon: React.ReactNode; label: string }[]).map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setLeftTab(t.key)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                    leftTab === t.key
                      ? "border-papaya-orange text-papaya-orange"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* Fixed-height scrollable content */}
            <div className="h-[700px] overflow-y-auto p-6">

              {/* ── KYC ── */}
              {leftTab === "kyc" && (
                <>
                  <div className="flex items-center gap-6 mb-3">
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
                    <DocImage label="Frente"  url={client.kyc.document_front} />
                    <DocImage label="Reverso" url={client.kyc.document_back} />
                    <DocImage label="Selfie"  url={client.kyc.selfie} />
                  </div>
                  {(() => {
                    const statsMap = Object.fromEntries(txStats.map((r) => [r.period_days, r]));
                    const chartData = [7, 30, 90, 360].map((days) => {
                      const r = statsMap[days];
                      return {
                        label: `${days} Días`,
                        monto: r?.monto_usd ?? 0,
                        cantidad: r?.cantidad ?? 0,
                        avg: r?.average ?? 0,
                      };
                    });
                    const maxMonto = Math.max(...chartData.map((d) => d.monto), 1);
                    return (
                      <div className="mt-3 border-t border-gray-50 pt-3">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Actividad por período · Monto USD</p>
                        <div className="space-y-2">
                          {chartData.map((d, i) => {
                            const pct = (d.monto / maxMonto) * 100;
                            return (
                              <div key={i} className="flex items-center gap-2">
                                <span className="text-[10px] text-gray-400 font-medium w-14 shrink-0 text-right">{d.label}</span>
                                <div className="relative flex-1 h-6 bg-gray-100 rounded-md overflow-hidden">
                                  {d.monto > 0 && (
                                    <div
                                      className="h-full bg-orange-500 rounded-md flex items-center justify-end pr-2 transition-all duration-300"
                                      style={{ width: `${pct}%` }}
                                    >
                                      <span className="text-[10px] font-semibold text-white whitespace-nowrap">{d.cantidad} tx</span>
                                    </div>
                                  )}
                                  {d.monto === 0 && (
                                    <span className="absolute inset-0 flex items-center pl-2 text-[10px] text-gray-400">sin txs</span>
                                  )}
                                </div>
                                <span className="text-[10px] text-gray-400 w-16 shrink-0">${d.monto.toFixed(0)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                  <ClientDocumentsSection clientId={client.id} />
                </>
              )}

              {/* ── Información Personal ── */}
              {leftTab === "personal" && form && (
                <>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <Field label="N° Documento"   value={client.personal.doc_id} />
                    <Field label="Tipo Documento" value={client.personal.id_type_label} />
                    <EditableField label="Nombre"         value={form.name}    onChange={(v) => setField("name", v)}    editing={editingFields.has("name")}    onToggleEdit={() => toggleFieldEdit("name")} showEdit={canWrite} />
                    <EditableField label="Correo"         value={form.email}   onChange={(v) => setField("email", v)}   editing={editingFields.has("email")}   onToggleEdit={() => toggleFieldEdit("email")} showEdit={canWrite} />
                    <EditableField label="Teléfono"       value={form.phone}   onChange={(v) => setField("phone", v)}   editing={editingFields.has("phone")}   onToggleEdit={() => toggleFieldEdit("phone")} showEdit={canWrite} />
                    <EditableField label="País"           value={form.country} onChange={(v) => setField("country", v)} editing={editingFields.has("country")} onToggleEdit={() => toggleFieldEdit("country")} showEdit={canWrite} />
                    <EditableField label="Ciudad"         value={form.city}    onChange={(v) => setField("city", v)}    editing={editingFields.has("city")}    onToggleEdit={() => toggleFieldEdit("city")} showEdit={canWrite} />
                    <EditableField label="Estado / Dpto." value={form.state}   onChange={(v) => setField("state", v)}   editing={editingFields.has("state")}   onToggleEdit={() => toggleFieldEdit("state")} showEdit={canWrite} />
                    <EditableField label="Código Postal"    value={form.postal_code} onChange={(v) => setField("postal_code", v)} editing={editingFields.has("postal_code")} onToggleEdit={() => toggleFieldEdit("postal_code")} showEdit={canWrite} />
                    <EditableField label="Fecha nacimiento" value={form.birth_date}  onChange={(v) => setField("birth_date", v)}  editing={editingFields.has("birth_date")}  onToggleEdit={() => toggleFieldEdit("birth_date")} type="date" showEdit={canWrite} />
                    <EditableField label="Ocupación"        value={form.occupation}  onChange={(v) => setField("occupation", v)}  editing={editingFields.has("occupation")}  onToggleEdit={() => toggleFieldEdit("occupation")} showEdit={canWrite} />
                  </div>
                  <div className="border-t border-gray-50 mt-3 pt-3">
                    <EditableField label="Dirección" value={form.address} onChange={(v) => setField("address", v)} editing={editingFields.has("address")} onToggleEdit={() => toggleFieldEdit("address")} showEdit={canWrite} />
                  </div>
                  <div className="border-t border-gray-50 mt-3 pt-3 flex items-center justify-between">
                    <Field label="Registro" value={fmtDate(client.created_at)} />
                    <div className="flex items-center gap-2">
                      {saveError && <span className="text-xs text-red-500">{saveError}</span>}
                      {saveSuccess && (
                        <span className="inline-flex items-center gap-1 text-xs text-green-icon">
                          <Check size={13} /> Guardado
                        </span>
                      )}
                      {canWrite && (
                        <button
                          type="button"
                          onClick={handleSave}
                          disabled={!isDirty || saving}
                          className="inline-flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-lg transition-all bg-papaya-orange text-white shadow-sm hover:bg-papaya-orange/90 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                        >
                          <Save size={14} />
                          {saving ? "Guardando…" : "Guardar cambios"}
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}

            </div>{/* end fixed-height content */}
          </div>
        </div>{/* end left sidebar */}

        {/* Right tabbed panel */}
        <div className="flex-1 min-w-0 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Tab bar */}
          <div className="flex items-center gap-0.5 px-4 pt-3 border-b border-gray-100">
            {([
              { key: "remesas",       icon: <Receipt size={13} />,       label: "Remesas",       count: remTotal },
              { key: "interacciones", icon: <MessageSquare size={13} />, label: "Interacciones" },
              { key: "beneficiarios", icon: <Users size={13} />,         label: "Beneficiarios", count: beneficiaries.length },
              { key: "soporte",       icon: <HelpCircle size={13} />,    label: "Chats",         count: handoffs.length },
              { key: "historial",     icon: <FileText size={13} />,      label: "Historial",     count: auditLog.length },
            ] as { key: typeof dataTab; icon: React.ReactNode; label: string; count?: number }[]).map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setDataTab(t.key)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                  dataTab === t.key
                    ? "border-papaya-orange text-papaya-orange"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {t.icon} {t.label}
                {(t.count ?? 0) > 0 && (
                  <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                    dataTab === t.key ? "bg-papaya-orange/10 text-papaya-orange" : "bg-gray-100 text-gray-500"
                  }`}>{t.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="h-[700px] overflow-y-auto p-6">

            {dataTab === "interacciones" && (
              <InteractionsSection bare clientId={Number(id)} clientEmail={form?.email ?? client.personal.email} />
            )}

            {dataTab === "remesas" && (remLoading ? (
              <div className="py-8 text-center text-sm text-gray-400 animate-pulse">Cargando…</div>
            ) : remittances.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Receipt size={32} className="text-gray-200 mb-2" />
                <p className="text-sm text-gray-400">Este cliente no tiene remesas registradas</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto -mx-6">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 border-y border-gray-100">
                      <tr>
                        {["ID Remesa", "Fecha / Hora (NY)", "Origen → Destino", "Monto USD", "Pagador", "Estado"].map((h) => (
                          <th key={h} className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {remittances.map((r) => (
                        <tr key={r.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-3 py-3 font-mono text-xs whitespace-nowrap">
                            <Link to={`/remesas/${r.id}`} className="text-papaya-orange hover:underline">{r.id}</Link>
                          </td>
                          <td className="px-3 py-3 text-gray-500 whitespace-nowrap text-xs">{fmtNY(r.created_at)}</td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 text-gray-700 text-xs">
                              <span className="font-medium">{r.origin_country_name || r.origin_country_id || "—"}</span>
                              <ArrowLeftRight size={11} className="text-gray-400" />
                              <span className="font-medium">{r.destination_country_name || r.destination_country_id || "—"}</span>
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums font-medium text-gray-800 text-xs whitespace-nowrap">{(r.sent_amount_local ?? (r.sent_amount_usd ?? 0) * r.collector_rate).toLocaleString("es", {minimumFractionDigits: 2, maximumFractionDigits: 2})} {r.sent_currency}</td>
                          <td className="px-3 py-3 text-gray-700 text-xs whitespace-nowrap">{r.payer_name || r.payer_id || "—"}</td>
                          <td className="px-3 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${REM_STATUS_COLORS[r.status] ?? "bg-gray-100 text-gray-500"}`}>
                              {REM_STATUS_LABELS[r.status] ?? r.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="-mx-6 -mb-6">
                  <Pagination page={remPage} totalPages={Math.ceil(remTotal / REM_PAGE_SIZE)} onPageChange={setRemPage} totalItems={remTotal} pageSize={REM_PAGE_SIZE} alwaysShow />
                </div>
              </>
            ))}

            {dataTab === "beneficiarios" && (beneficiaries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Users size={32} className="text-gray-200 mb-2" />
                <p className="text-sm text-gray-400">Este cliente no tiene beneficiarios registrados</p>
              </div>
            ) : (() => {
              const bTotalPages = Math.ceil(beneficiaries.length / B_PAGE_SIZE);
              const bSlice = beneficiaries.slice((bPage - 1) * B_PAGE_SIZE, bPage * B_PAGE_SIZE);
              return (
                <>
                  <div className="overflow-x-auto -mx-6">
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="bg-gray-50 border-y border-gray-100">
                          <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nombre</th>
                          <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"><span className="flex items-center gap-1.5"><CreditCard size={12} />Cédula</span></th>
                          <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"><span className="flex items-center gap-1.5"><Phone size={12} />Teléfono</span></th>
                          <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"><span className="flex items-center gap-1.5"><MapPin size={12} />Ciudad</span></th>
                          <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Dirección</th>
                          <th className="px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Registro</th>
                          <th className="px-3 py-3" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {bSlice.map((b) => {
                          const isEditing = bEditingId === b.id;
                          if (isEditing) return (
                            <React.Fragment key={b.id}>
                              <tr className="bg-yellow-50/50">
                                <td className="px-3 py-2"><input value={bEditForm.full_name} onChange={(e) => setBEditForm((p) => ({ ...p, full_name: e.target.value }))} className={cellInput} /></td>
                                <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{b.cedula}</td>
                                <td className="px-3 py-2"><input value={bEditForm.phone} onChange={(e) => setBEditForm((p) => ({ ...p, phone: e.target.value }))} className={cellInput} /></td>
                                <td className="px-3 py-2"><input value={bEditForm.city} onChange={(e) => setBEditForm((p) => ({ ...p, city: e.target.value }))} className={cellInput} /></td>
                                <td className="px-3 py-2"><input value={bEditForm.address} onChange={(e) => setBEditForm((p) => ({ ...p, address: e.target.value }))} className={cellInput} /></td>
                                <td className="px-3 py-2 text-xs text-gray-400 whitespace-nowrap">{fmtDate(b.created_at)}</td>
                                <td className="px-3 py-2">
                                  <div className="flex items-center gap-1">
                                    <button onClick={saveBEdit} disabled={bEditSaving} className="p-1.5 rounded-lg hover:bg-green-100 text-green-600 disabled:opacity-40 transition-colors" title="Guardar"><Check size={14} /></button>
                                    <button onClick={cancelBEdit} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title="Cancelar"><X size={14} /></button>
                                  </div>
                                </td>
                              </tr>
                              {bEditError && <tr className="bg-red-50"><td colSpan={7} className="px-4 py-2 text-xs text-red-700"><AlertTriangle size={12} className="inline mr-1 text-red-500" />{bEditError}</td></tr>}
                            </React.Fragment>
                          );
                          return (
                            <tr key={b.id} className="hover:bg-gray-50/60 transition-colors">
                              <td className="px-3 py-3 font-medium text-gray-800 whitespace-nowrap">{b.full_name}</td>
                              <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{b.cedula}</td>
                              <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{b.phone}</td>
                              <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{b.city}</td>
                              <td className="px-3 py-3 text-gray-600">{b.address}</td>
                              <td className="px-3 py-3 text-gray-400 whitespace-nowrap text-xs">{fmtDate(b.created_at)}</td>
                              <td className="px-3 py-3"><button onClick={() => startBEdit(b)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 hover:text-blue-700 transition-colors" title="Editar">✎</button></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="-mx-6 -mb-6">
                    <Pagination page={bPage} totalPages={bTotalPages} onPageChange={setBPage} totalItems={beneficiaries.length} pageSize={B_PAGE_SIZE} alwaysShow />
                  </div>
                </>
              );
            })())}

            {dataTab === "soporte" && (handoffLoading ? (
              <div className="py-8 text-center text-sm text-gray-400 animate-pulse">Cargando…</div>
            ) : handoffs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <HelpCircle size={32} className="text-gray-200 mb-2" />
                <p className="text-sm text-gray-400">Sin solicitudes de soporte registradas</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-6">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 border-y border-gray-100">
                    <tr>{["Fecha (NY)", "Estado", "Agente", "Espera", ""].map((h) => (
                      <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {handoffs.map((h) => {
                      const iso = (s: string) => s.includes("T") ? s : s.replace(" ", "T") + "Z";
                      const statusColors: Record<string, string> = { pendiente: "bg-yellow-50 text-yellow-700", en_proceso: "bg-blue-50 text-blue-700", cerrado: "bg-gray-100 text-gray-500" };
                      const statusLabels: Record<string, string> = { pendiente: "Pendiente", en_proceso: "En proceso", cerrado: "Cerrado" };
                      const diffMs = h.closed_at ? new Date(iso(h.closed_at)).getTime() - new Date(iso(h.created_at)).getTime() : Date.now() - new Date(iso(h.created_at)).getTime();
                      const mins = Math.floor(diffMs / 60000);
                      const duration = mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}min`;
                      return (
                        <tr key={h.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtNY(h.created_at)}</td>
                          <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[h.status] ?? "bg-gray-100 text-gray-500"}`}>{statusLabels[h.status] ?? h.status}</span></td>
                          <td className="px-4 py-3 text-xs text-gray-600">{h.agent_id || "—"}</td>
                          <td className="px-4 py-3 text-xs text-gray-400">{duration}</td>
                          <td className="px-4 py-3"><button onClick={() => openHandoffChat(h.id)} className="inline-flex items-center gap-1 text-xs text-papaya-orange hover:text-orange-600 font-medium whitespace-nowrap"><MessageSquare size={12} /> Ver chat</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}

            {dataTab === "historial" && (auditLog.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <FileText size={32} className="text-gray-200 mb-2" />
                <p className="text-sm text-gray-400">Sin modificaciones registradas</p>
              </div>
            ) : (() => {
              const auditTotalPages = Math.ceil(auditLog.length / AUDIT_PAGE_SIZE);
              const auditSlice = auditLog.slice((auditPage - 1) * AUDIT_PAGE_SIZE, auditPage * AUDIT_PAGE_SIZE);
              return (
                <>
                  <div className="overflow-x-auto -mx-6">
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
                        {auditSlice.map((entry) => (
                          <tr key={entry.id} className="hover:bg-gray-50/60 transition-colors align-top">
                            <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{fmtNY(entry.created_at)}</td>
                            <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{entry.user}</td>
                            <td className="px-4 py-3 text-xs whitespace-nowrap">
                              {entry.entity_type === "client" ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium"><User size={10} /> Cliente</span>
                              ) : entry.entity_type === "document" ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 text-orange-500 font-medium"><FileText size={10} /> Documento</span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium"><Users size={10} /> {entry.entity_label || "Beneficiario"}</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {entry.entity_type === "document" ? (() => {
                                const c = entry.changes as Record<string, string>;
                                const isUpload = c.action === "upload";
                                return (
                                  <p className="text-xs text-gray-700">
                                    <span className={`font-medium ${isUpload ? "text-green-600" : "text-red-500"}`}>
                                      {isUpload ? "Subido" : "Eliminado"}:
                                    </span>{" "}
                                    {c.name}
                                    {c.mime_type && <span className="text-gray-400 ml-1">({c.mime_type})</span>}
                                  </p>
                                );
                              })() : (
                                <ul className="space-y-0.5">
                                  {Object.entries(entry.changes).map(([field, val]) => {
                                    const { from, to } = val as { from: string | null; to: string | null };
                                    return (
                                      <li key={field} className="text-xs text-gray-700">
                                        <span className="font-medium text-gray-500">{FIELD_LABELS[field] ?? field}:</span>{" "}
                                        <span className="text-gray-400 line-through">{fmtFieldValue(field, from)}</span>{" → "}
                                        <span className="text-gray-800 font-medium">{fmtFieldValue(field, to)}</span>
                                      </li>
                                    );
                                  })}
                                </ul>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="-mx-6 -mb-6">
                    <Pagination page={auditPage} totalPages={auditTotalPages} onPageChange={setAuditPage} totalItems={auditLog.length} pageSize={AUDIT_PAGE_SIZE} alwaysShow />
                  </div>
                </>
              );
            })())}

          </div>{/* end tab content */}
        </div>{/* end right tabbed panel */}

      </div>{/* end two-column layout */}

      {/* Confirmation modal — active toggle */}
      {showActiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm cursor-default">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${activeStatus ? "bg-red-50" : "bg-green-50"}`}>
                {activeStatus ? <ShieldOff size={18} className="text-red-icon" /> : <ShieldCheck size={18} className="text-green-icon" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-heading-text">{activeStatus ? "Desactivar cuenta" : "Activar cuenta"}</p>
                <p className="text-xs text-body-text mt-0.5">{client.personal.name || client.phone}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              {activeStatus
                ? "¿Estás seguro de que deseas desactivar esta cuenta? El cliente no podrá realizar operaciones."
                : "¿Deseas reactivar esta cuenta? El cliente podrá volver a operar con normalidad."}
            </p>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowActiveModal(false)} className="flex-1 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">Cancelar</button>
              <button onClick={confirmToggleActive} className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${activeStatus ? "bg-red-500 hover:bg-red-600" : "bg-green-icon hover:bg-green-icon/90"}`}>
                {activeStatus ? "Sí, desactivar" : "Sí, activar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Risk analysis modal */}
      {showRiskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 cursor-default">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <AlertOctagon size={16} className="text-papaya-orange" />
                <span className="text-sm font-semibold text-heading-text">Análisis de riesgo</span>
              </div>
              <button onClick={() => setShowRiskModal(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-5 space-y-5 overflow-y-auto max-h-[75vh]">
              {/* Overall score */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-yellow-50 border border-yellow-100">
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Puntuación de riesgo</p>
                  <p className="text-2xl font-bold text-yellow-600">Medio</p>
                </div>
                <div className="w-14 h-14 rounded-full bg-yellow-100 flex items-center justify-center">
                  <span className="text-2xl font-bold text-yellow-600">54</span>
                </div>
              </div>

              {/* Factors */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Factores evaluados</p>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 border border-green-100">
                  <CheckCircle2 size={15} className="text-green-icon mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">Identidad verificada</p>
                    <p className="text-xs text-gray-500 mt-0.5">KYC aprobado. Documentos válidos y selfie coincidente.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 border border-green-100">
                  <CheckCircle2 size={15} className="text-green-icon mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">Historial de transacciones</p>
                    <p className="text-xs text-gray-500 mt-0.5">Volumen consistente con el perfil declarado. Sin patrones inusuales.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-50 border border-yellow-100">
                  <TrendingUp size={15} className="text-yellow-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">Frecuencia de envíos</p>
                    <p className="text-xs text-gray-500 mt-0.5">Ligero incremento en los últimos 30 días. Requiere monitoreo.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-50 border border-yellow-100">
                  <Info size={15} className="text-yellow-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">País de destino</p>
                    <p className="text-xs text-gray-500 mt-0.5">Destino clasificado en categoría de vigilancia moderada.</p>
                  </div>
                </div>
              </div>

              {/* Recommendation */}
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Recomendación</p>
                <p className="text-sm text-gray-700">Continuar operaciones con seguimiento mensual. Solicitar documentación de origen de fondos si el volumen supera $2,000 USD en el próximo periodo.</p>
              </div>

              <p className="text-[11px] text-gray-400 text-center">
                Este análisis es generado de forma simulada. Próximamente será procesado por inteligencia artificial.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Handoff chat read-only modal */}
      {showHandoffChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden" style={{ maxHeight: "80vh" }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-papaya-orange" />
                <span className="text-sm font-semibold text-heading-text">Chat de soporte</span>
              </div>
              <button onClick={() => setShowHandoffChat(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div
              ref={handoffChatScrollRef}
              className="flex-1 overflow-y-auto px-4 py-4 space-y-2 "
            >
              {handoffChatLoading ? (
                <div className="text-center text-sm text-gray-400 animate-pulse py-8">Cargando…</div>
              ) : handoffChatMessages.length === 0 ? (
                <div className="text-center text-sm text-gray-400 py-8">Sin historial de chat registrado</div>
              ) : handoffChatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[78%] px-3 py-2 rounded-2xl text-sm leading-snug ${
                    msg.sender === "user"
                      ? "bg-papaya-orange text-white rounded-br-sm"
                      : "bg-gray-100 text-gray-800 rounded-bl-sm"
                  }`}>
                    <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                    <p className={`text-[10px] mt-1 ${msg.sender === "user" ? "text-white/60 text-right" : "text-gray-400"}`}>
                      {new Date(msg.created_at).toLocaleString("es", { timeZone: "America/New_York", dateStyle: "short", timeStyle: "short" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
