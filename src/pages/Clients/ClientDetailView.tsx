import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck, ShieldOff, User, FileText } from "lucide-react";
import { api, ClientDetail } from "../../api";

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleString("es", { dateStyle: "medium", timeStyle: "short" });
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm text-gray-800">{value || "—"}</p>
    </div>
  );
}

function DocImage({ label, url }: { label: string; url: string | null | undefined }) {
  if (!url) {
    return (
      <div>
        <p className="text-xs text-gray-400 mb-1">{label}</p>
        <div className="w-full h-36 rounded-lg border border-gray-100 bg-gray-50 flex items-center justify-center text-xs text-gray-300">
          Sin imagen
        </div>
      </div>
    );
  }
  return (
    <div>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <a href={url} target="_blank" rel="noreferrer">
        <img src={url} alt={label} className="w-full h-36 object-cover rounded-lg border border-gray-100 hover:opacity-90 transition-opacity" />
      </a>
    </div>
  );
}

export const ClientDetailView = () => {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api.getClientDetail(Number(id))
      .then(setClient)
      .catch(() => setError("No se pudo cargar el cliente."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-sm text-gray-400 animate-pulse">Cargando…</div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <Link to="/clientes" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft size={15} /> Clientes
        </Link>
        <div className="text-sm text-red-500">{error || "Cliente no encontrado."}</div>
      </div>
    );
  }

  const kycResultColor =
    client.kyc.verification_result === "APPROVED"
      ? "text-green-icon bg-green-light"
      : client.kyc.verification_result
      ? "text-red-icon bg-red-light"
      : "text-gray-400 bg-gray-100";

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      {/* Back */}
      <Link to="/clientes" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft size={15} /> Clientes
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-heading-text">
            {client.personal.name || client.phone}
          </h1>
          <p className="text-sm text-body-text mt-0.5">Cliente #{client.id} · {client.phone}</p>
        </div>
        {client.kyc_valid ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-light text-green-icon">
            <ShieldCheck size={13} /> Verificado
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-light text-red-icon">
            <ShieldOff size={13} /> Pendiente
          </span>
        )}
      </div>

      {/* Card 1 — Personal info */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-heading-text">
          <User size={15} className="text-papaya-orange" />
          Información Personal
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
          <Field label="N° Documento"   value={client.personal.doc_id} />
          <Field label="Tipo Documento" value={client.personal.id_type_label} />
          <Field label="Nombre"         value={client.personal.name} />
          <Field label="Correo"         value={client.personal.email} />
          <Field label="Teléfono"       value={client.phone} />
          <Field label="País"           value={client.personal.country} />
          <Field label="Dirección"      value={client.personal.address} />
          <Field label="Ciudad"         value={client.personal.city} />
          <Field label="Estado / Dpto." value={client.personal.state} />
        </div>
        <div className="border-t border-gray-50 pt-3">
          <Field label="Registro" value={fmtDate(client.created_at)} />
        </div>
      </div>

      {/* Card 2 — KYC */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-heading-text">
          <FileText size={15} className="text-papaya-orange" />
          Información KYC
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Resultado</p>
            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${kycResultColor}`}>
              {client.kyc.verification_result || "—"}
            </span>
          </div>
          <Field label="Fecha verificación" value={fmtDate(client.kyc.kyc_created_at)} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <DocImage label="Documento (frente)" url={client.kyc.document_front} />
          <DocImage label="Documento (reverso)" url={client.kyc.document_back} />
          <DocImage label="Selfie" url={client.kyc.selfie} />
        </div>
      </div>
    </div>
  );
};
