import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Search, X, ShieldCheck, ShieldOff } from "lucide-react";
import { api, Client, ClientsFilters } from "../../api";
import { Pagination } from "../../components/ui/Pagination";

const PAGE_SIZE = 10;

function fmtDate(s: string) {
  if (!s) return "—";
  return new Date(s).toLocaleString("es", { dateStyle: "short", timeStyle: "short" });
}

const inputCls =
  "h-8 rounded-lg border border-gray-200 px-3 text-xs text-gray-700 placeholder-gray-400 focus:border-papaya-orange focus:outline-none bg-white";

export const ClientsView = () => {
  const [items, setItems]           = useState<Client[]>([]);
  const [total, setTotal]           = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const [fName,      setFName]      = useState("");
  const [fEmail,     setFEmail]     = useState("");
  const [fPhone,     setFPhone]     = useState("");
  const [fDateFrom,  setFDateFrom]  = useState("");
  const [fDateTo,    setFDateTo]    = useState("");

  const fetchClients = useCallback(async (p: number, filters: ClientsFilters) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getClients(p, filters);
      setItems(res.items);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch {
      setError("Error al cargar clientes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients(page, { name: fName, email: fEmail, phone: fPhone, date_from: fDateFrom, date_to: fDateTo });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleSearch = () => {
    setPage(1);
    fetchClients(1, { name: fName, email: fEmail, phone: fPhone, date_from: fDateFrom, date_to: fDateTo });
  };

  const handleClear = () => {
    setFName(""); setFEmail(""); setFPhone(""); setFDateFrom(""); setFDateTo("");
    setPage(1);
    fetchClients(1, {});
  };

  const hasFilters = fName || fEmail || fPhone || fDateFrom || fDateTo;

  const KycBadge = ({ valid }: { valid: boolean }) =>
    valid ? (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-light text-green-icon">
        <ShieldCheck size={11} /> Verificado
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-light text-red-icon">
        <ShieldOff size={11} /> Pendiente
      </span>
    );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-heading-text">Clientes</h1>
        <p className="text-sm text-body-text mt-0.5">Listado de usuarios registrados en el chat</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Nombre</label>
            <input className={inputCls} placeholder="Buscar nombre…" value={fName}
              onChange={e => setFName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSearch()} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Correo</label>
            <input className={inputCls} placeholder="Buscar correo…" value={fEmail}
              onChange={e => setFEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSearch()} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Teléfono</label>
            <input className={inputCls} placeholder="+57…" value={fPhone}
              onChange={e => setFPhone(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSearch()} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Fecha desde</label>
            <input type="date" className={inputCls} value={fDateFrom}
              onChange={e => setFDateFrom(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Fecha hasta</label>
            <input type="date" className={inputCls} value={fDateTo}
              onChange={e => setFDateTo(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSearch}
              className="flex-1 h-8 flex items-center justify-center gap-1.5 rounded-lg bg-papaya-orange text-white text-xs font-medium hover:bg-orange-500 transition-colors">
              <Search size={13} /> Buscar
            </button>
            {hasFilters && (
              <button onClick={handleClear}
                className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors">
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {error && (
          <div className="px-4 py-3 text-sm text-red-icon bg-red-light border-b border-red-200">{error}</div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["ID", "N° Documento", "Tipo Doc.", "Nombre", "Correo", "Teléfono", "KYC", "Registro"].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-400">Cargando…</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                    {hasFilters ? "Sin resultados para los filtros aplicados." : "No hay clientes registrados."}
                  </td>
                </tr>
              ) : (
                items.map(c => (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono">
                      <Link to={`/clientes/${c.id}`} className="text-papaya-orange hover:underline">{c.id}</Link>
                    </td>
                    <td className="px-4 py-3 font-mono">{c.doc_id || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{c.id_type_label || "—"}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{c.name || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{c.email || "—"}</td>
                    <td className="px-4 py-3 font-mono">{c.phone}</td>
                    <td className="px-4 py-3"><KycBadge valid={c.kyc_valid} /></td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{fmtDate(c.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={p => setPage(p)}
          totalItems={total}
          pageSize={PAGE_SIZE}
        />
      </div>
    </div>
  );
};
