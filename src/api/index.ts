// ── Types ─────────────────────────────────────────────────────────────────────

export interface Partnership {
  id: number;
  name: string;
}

export interface Country {
  id: string;
  name: string;
  send: boolean;
  receive: boolean;
  currency_code: string | null;
}

export interface CountryUpdateIn {
  name: string;
  send: boolean;
  receive: boolean;
  currency_code: string | null;
}

export interface Gateway {
  id: string;
  name: string;
  status: "active" | "inactive";
  coverage_mode: "all" | "specific" | "only" | "except";
  origin_countries: string[];
  coverage_states: string[];
  created_at: string;
  rate_status: "complete" | "partial" | "empty";
}

export interface GatewayIn {
  name: string;
  status: string;
  coverage_mode: string;
  origin_countries: string[];
  coverage_states: string[];
}

export interface CommissionRow {
  range_min: number;
  range_max: number;
  fee: number | null;
}

export interface PaymentMethodData {
  active: boolean;
  commissions: CommissionRow[];
}

export interface Pagador {
  id: string;
  name: string;
  status: "active" | "inactive";
  countries: string[];
  country_fx: Record<string, number>;
  created_at: string;
  rate_status: "complete" | "partial" | "empty";
}

export interface PagadorIn {
  name: string;
  status: string;
  countries: string[];
  country_fx: Record<string, number>;
}

export interface Rate {
  id: string;
  name: string;
  status: "active" | "inactive";
  payment_methods: {
    cash_pickup: PaymentMethodData;
    mobile_wallet: PaymentMethodData;
    bank_deposit: PaymentMethodData;
  };
  created_at: string;
}

export interface RateIn {
  name: string;
  status: string;
  payment_methods: Record<string, { commissions: CommissionRow[] }>;
}

export interface GatewayAlternanciaSlot {
  id: string;
  gateway_id: string;
  amount_min: number;
  amount_max: number;
  active: boolean;
}

export interface GatewayAlternanciaSlotIn {
  gateway_id: string;
  amount_min: number;
  amount_max: number;
  active: boolean;
}

export interface AlternanciaSlot {
  id: string;
  country_id: string;
  pagador_id: string;
  partnership_id: number;
  hour_start: number;
  hour_end: number;
  amount_min: number;
  amount_max: number;
  payment_methods: string[];
  days_of_week: number[];
  active: boolean;
}

export interface AlternanciaSlotIn {
  country_id: string;
  pagador_id: string;
  partnership_id: number;
  hour_start: number;
  hour_end: number;
  amount_min: number;
  amount_max: number;
  payment_methods: string[];
  days_of_week: number[];
  active: boolean;
}

export interface Currency {
  code: string;
  name: string;
}

export interface State {
  id: string;
  name: string;
  country_id: string;
}

export interface City {
  id: number;
  name: string;
  state_id: string;
}

export interface ExchangeRate {
  id: number;
  entity_type: string;
  entity_id: string;
  country_id: string;
  rate: number;
}

export interface ExchangeRateIn {
  country_id: string;
  rate: number;
}

// ── Delivery Flows ─────────────────────────────────────────────────────────────

export type DeliveryNodeType = "phone" | "account_number" | "bank_list";
export type DeliveryMethodType = "cash_pickup" | "mobile_wallet" | "bank_deposit";

export interface DeliveryFlowNodeConfig {
  prefixes?:   string;  // phone: "+57,+58"
  min_digits?: number;  // account_number
  max_digits?: number;  // account_number
  banks?:      string;  // bank_list: comma-separated
  label?:      string;
}

export interface DeliveryFlowNode {
  id:         string;
  node_type:  DeliveryNodeType;
  sort_order: number;
  config:     DeliveryFlowNodeConfig;
}

export interface DeliveryWallet {
  id?:        number;
  name:       string;
  sort_order: number;
  kind:       "wallet" | "agency";
}

export interface DeliveryFlow {
  id?:            string;
  country_id:     string;
  method:         DeliveryMethodType;
  active:         boolean;
  pos_x:          number;
  pos_y:          number;
  sort_order:     number;
  question_label?: string | null;
  nodes:          DeliveryFlowNode[];
  wallets:        DeliveryWallet[];
}

export type DeliveryFlowIn = Omit<DeliveryFlow, "id"> & {
  nodes: Omit<DeliveryFlowNode, "id">[];
  wallets: Omit<DeliveryWallet, "id">[];
};

export interface CountryWallet {
  id:             number;
  country_id:     string;
  partnership_id: number;
  name:           string;
  sort_order:     number;
}

export interface CountryAgency {
  id:             number;
  country_id:     string;
  partnership_id: number;
  name:           string;
  sort_order:     number;
}

export interface Tariff {
  id: number;
  collector_id: string;
  payer_id: string;
  origin_country_id: string;
  destination_country_id: string;
  range_min: number;
  range_max: number;
  fee_flat: number | null;
  fee_percentage: number | null;
  payment_method: string;
  disbursement_method: string;
  created_at: string;
  updated_at: string;
  has_overlap: boolean;
  partnership_id: number;
}

export interface TariffIn {
  collector_id: string;
  payer_id: string;
  origin_country_id: string;
  destination_country_id: string;
  range_min: number;
  range_max: number;
  fee_flat: number | null;
  fee_percentage: number | null;
  payment_method: string;
  disbursement_method: string;
  partnership_id: number;
}

export interface RemittanceRecord {
  id: string;
  created_at: string;
  client_id: string | null;
  origin_country_id: string | null;
  destination_country_id: string | null;
  sent_amount: number;
  sent_currency: string;
  amount_to_pay: number;
  pay_currency: string;
  fee_amount: number;
  collector_id: string | null;
  collector_rate: number;
  payer_rate: number;
  fx_percentage: number;
  papaya_rate: number;
  rate_spread: number;
  payer_id: string | null;
  partnership_id: number;
  disbursement_method: string | null;
  sender_payment_method: string | null;
  status: string;
  beneficiary: string | null;
  beneficiary_doc_id: string | null;
  payment_details: string | null;
  origin_country_name: string | null;
  destination_country_name: string | null;
  collector_name: string | null;
  payer_name: string | null;
  partnership_name: string | null;
  client_name: string | null;
  client_db_id: number | null;
  client_phone: string | null;
  client_email: string | null;
  client_address: string | null;
  client_city: string | null;
  client_state: string | null;
}

export interface Client {
  id: number;
  phone: string;
  name: string | null;
  kyc_valid: boolean;
  doc_id: string | null;
  id_type: string | null;
  id_type_label: string;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientsPage {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  items: Client[];
}

export interface ClientPersonalUpdate {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  country?: string | null;
  city?: string | null;
  state?: string | null;
  address?: string | null;
}

export interface ClientDetail {
  id: number;
  phone: string;
  kyc_valid: boolean;
  active: boolean;
  created_at: string;
  personal: {
    doc_id: string | null;
    id_type: string | null;
    id_type_label: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
  };
  kyc: {
    verification_result: string | null;
    kyc_created_at: string | null;
    document_front: string | null;
    document_back: string | null;
    selfie: string | null;
  };
}

export interface Beneficiary {
  id: string;
  client_phone: string;
  full_name: string;
  cedula: string;
  city: string;
  address: string;
  phone: string;
  created_at: string;
  updated_at: string;
}

export interface BeneficiaryUpdateIn {
  full_name: string;
  city: string;
  address: string;
  phone: string;
}

export interface RemittanceAuditEntry {
  id: number;
  remittance_id: string;
  user: string;
  action: string;
  changes: Record<string, { from: string | null; to: string | null }>;
  created_at: string;
}

export interface AuditLogEntry {
  id: number;
  client_id: number;
  user: string;
  entity_type: "client" | "beneficiary";
  entity_id: string;
  entity_label: string | null;
  changes: Record<string, { from: string | null; to: string | null }>;
  created_at: string;
}

export interface ClientsFilters {
  name?: string;
  email?: string;
  phone?: string;
  date_from?: string;
  date_to?: string;
}

export interface ClientTxStatRow {
  period_days: number;
  cantidad: number;
  monto_usd: number;
  average: number;
}

// ── Dashboard types ───────────────────────────────────────────────────────────

export interface DashboardKpis {
  date_hoy: string;       date_ayer: string;
  registros_hoy: number;  registros_ayer: number;
  nuevos_hoy: number;     nuevos_ayer: number;
  txn_hoy: number;        txn_ayer: number;
  monto_hoy: number;      monto_ayer: number;
  ticket_hoy: number;     ticket_ayer: number;
}
export interface DashboardEmisorRow {
  pais: string; registros: number; nuevos: number;
  txn: number;  monto: number;     ticket: number;
}
export interface DashboardReceptorRow {
  pais: string; txn: number; monto: number; ticket: number;
}
export interface DashboardPieSlice { name: string; value: number; }
export interface DashboardTxnDay   { fecha: string; value: number; }
export interface DashboardRegDay   { fecha: string; actual: number; promedio: number; meta: number; }
export interface DashboardAdmin {
  date_from: string;
  date_to: string;
  kpis: DashboardKpis;
  emisor: DashboardEmisorRow[];
  receptor: DashboardReceptorRow[];
  metodo_recoleccion: DashboardPieSlice[];
  metodo_pago: DashboardPieSlice[];
  txn_paid_31d: DashboardTxnDay[];
  registros_plataforma: DashboardRegDay[];
  canales: { chatbot_landing: number; whatsapp: number };
}

export interface CalculateAmountResult {
  payerId: string;
  payerRate: number;
  collectorId: string;
  collectorRate: number;
  amountInUsdCollector: number;
  fxPercentage: number;
  papayaRate: number;
  amountToDeliver: number;
  papayaFee: number;
  papayaFeeLocal: number;
  feeType: "flat" | "percentage";
  amountToPay: number;
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

const API_KEY  = import.meta.env.VITE_API_KEY ?? "";
const API_BASE = import.meta.env.VITE_API_URL ?? "";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/api${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY,
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Error en la solicitud");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── API ───────────────────────────────────────────────────────────────────────

export const api = {
  // Dashboard
  getDashboardAdmin: (dateFrom?: string, dateTo?: string) => {
    const params = new URLSearchParams();
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo)   params.set("date_to",   dateTo);
    const qs = params.toString();
    return request<DashboardAdmin>(`/dashboard/admin${qs ? `?${qs}` : ""}`);
  },

  // Partnerships
  getPartnerships: () => request<Partnership[]>("/partnerships"),
  createPartnership: (name: string) =>
    request<Partnership>("/partnerships", { method: "POST", body: JSON.stringify({ name }) }),
  updatePartnership: (id: number, name: string) =>
    request<Partnership>(`/partnerships/${id}`, { method: "PUT", body: JSON.stringify({ name }) }),
  deletePartnership: (id: number) =>
    request<void>(`/partnerships/${id}`, { method: "DELETE" }),

  // Countries
  getCountries: () => request<Country[]>("/countries"),
  updateCountry: (id: string, data: CountryUpdateIn) =>
    request<Country>(`/countries/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  // Gateways
  getGateways: () => request<Gateway[]>("/gateways"),
  createGateway: (data: GatewayIn) =>
    request<Gateway>("/gateways", { method: "POST", body: JSON.stringify(data) }),
  updateGateway: (id: string, data: GatewayIn) =>
    request<Gateway>(`/gateways/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteGateway: (id: string) =>
    request<void>(`/gateways/${id}`, { method: "DELETE" }),

  // Pagadores
  getPagadores: () => request<Pagador[]>("/pagadores"),
  createPagador: (data: PagadorIn) =>
    request<Pagador>("/pagadores", { method: "POST", body: JSON.stringify(data) }),
  updatePagador: (id: string, data: PagadorIn) =>
    request<Pagador>(`/pagadores/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deletePagador: (id: string) =>
    request<void>(`/pagadores/${id}`, { method: "DELETE" }),

  // Rates
  getRates: () => request<Rate[]>("/rates"),
  updateRate: (id: string, data: RateIn) =>
    request<Rate>(`/rates/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  // Currencies
  getCurrencies: () => request<Currency[]>("/currencies"),

  // States & Cities
  getStates: (country_id?: string) =>
    request<State[]>(`/states${country_id ? `?country_id=${country_id}` : ""}`),
  getCities: (state_id?: string) =>
    request<City[]>(`/cities${state_id ? `?state_id=${state_id}` : ""}`),

  // Calculator
  calculateAmount: (payload: {
    originCountry: string;
    originCity?: string | null;
    collectorId?: string | null;
    destinationCountry: string;
    sentAmount: number;
    paymentMethod: string;
    senderPaymentMethod: string;
    timezone: string;
    completeResponse?: boolean;
    partnershipId?: number;
  }) =>
    request<CalculateAmountResult>("/calculate-amount", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Exchange Rates
  getExchangeRates: () => request<ExchangeRate[]>("/exchange-rates"),
  replaceExchangeRates: (entityType: string, entityId: string, rates: ExchangeRateIn[]) =>
    request<ExchangeRate[]>(`/exchange-rates/${entityType}/${entityId}`, {
      method: "PUT",
      body: JSON.stringify(rates),
    }),

  // Alternancia
  getAlternancia: () => request<AlternanciaSlot[]>("/alternancia"),
  replaceAlternancia: (slots: AlternanciaSlotIn[]) =>
    request<AlternanciaSlot[]>("/alternancia", { method: "PUT", body: JSON.stringify(slots) }),

  // Gateway Alternancia
  getGatewayAlternancia: () => request<GatewayAlternanciaSlot[]>("/gateway-alternancia"),
  replaceGatewayAlternancia: (slots: GatewayAlternanciaSlotIn[]) =>
    request<GatewayAlternanciaSlot[]>("/gateway-alternancia", { method: "PUT", body: JSON.stringify(slots) }),

  // Tariffs
  getTariffs: () => request<Tariff[]>("/tariffs"),
  createTariff: (data: TariffIn) =>
    request<Tariff>("/tariffs", { method: "POST", body: JSON.stringify(data) }),
  updateTariff: (id: number, data: TariffIn) =>
    request<Tariff>(`/tariffs/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteTariff: (id: number) =>
    request<void>(`/tariffs/${id}`, { method: "DELETE" }),
  duplicateTariff: (id: number) =>
    request<Tariff>(`/tariffs/${id}/duplicate`, { method: "POST" }),

  // Delivery Flows
  getDeliveryFlows: (partnershipId: number, countryId: string) =>
    request<DeliveryFlow[]>(`/delivery-flows/${partnershipId}/${countryId}`),
  replaceDeliveryFlows: (partnershipId: number, countryId: string, flows: DeliveryFlowIn[]) =>
    request<DeliveryFlow[]>(`/delivery-flows/${partnershipId}/${countryId}`, {
      method: "PUT",
      body: JSON.stringify(flows),
    }),

  // Country Wallet Palette
  getCountryWallets: (partnershipId: number, countryId: string) =>
    request<CountryWallet[]>(`/delivery-wallets/${partnershipId}/${countryId}`),
  addCountryWallet: (partnershipId: number, countryId: string, name: string) =>
    request<CountryWallet>(`/delivery-wallets/${partnershipId}/${countryId}`, {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  deleteCountryWallet: (partnershipId: number, countryId: string, walletId: number) =>
    request<void>(`/delivery-wallets/${partnershipId}/${countryId}/${walletId}`, { method: "DELETE" }),
  reorderCountryWallets: (partnershipId: number, countryId: string, orderedIds: number[]) =>
    request<CountryWallet[]>(`/delivery-wallets/${partnershipId}/${countryId}/reorder`, {
      method: "PUT",
      body: JSON.stringify({ ordered_ids: orderedIds }),
    }),

  // Country Agency Palette
  getCountryAgencies: (partnershipId: number, countryId: string) =>
    request<CountryAgency[]>(`/delivery-agencies/${partnershipId}/${countryId}`),
  addCountryAgency: (partnershipId: number, countryId: string, name: string) =>
    request<CountryAgency>(`/delivery-agencies/${partnershipId}/${countryId}`, {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  deleteCountryAgency: (partnershipId: number, countryId: string, agencyId: number) =>
    request<void>(`/delivery-agencies/${partnershipId}/${countryId}/${agencyId}`, { method: "DELETE" }),
  reorderCountryAgencies: (partnershipId: number, countryId: string, orderedIds: number[]) =>
    request<CountryAgency[]>(`/delivery-agencies/${partnershipId}/${countryId}/reorder`, {
      method: "PUT",
      body: JSON.stringify({ ordered_ids: orderedIds }),
    }),

  // Clients
  getClients: (page: number, filters: ClientsFilters) => {
    const params = new URLSearchParams({ page: String(page), page_size: "10" });
    if (filters.name)      params.set("name",      filters.name);
    if (filters.email)     params.set("email",     filters.email);
    if (filters.phone)     params.set("phone",     filters.phone);
    if (filters.date_from) params.set("date_from", filters.date_from);
    if (filters.date_to)   params.set("date_to",   filters.date_to);
    return request<ClientsPage>(`/clients?${params.toString()}`);
  },
  getClientDetail: (id: number) => request<ClientDetail>(`/clients/${id}`),
  updateClientPersonal: (id: number, data: ClientPersonalUpdate) =>
    request<{ ok: boolean }>(`/clients/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  getClientBeneficiaries: (phone: string) =>
    request<{ client_phone: string; items: Beneficiary[]; total: number }>(
      `/beneficiaries/client/${encodeURIComponent(phone)}`
    ),
  updateBeneficiary: (id: string, data: BeneficiaryUpdateIn) =>
    request<Beneficiary>(`/beneficiaries/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  getClientAuditLog: (id: number) =>
    request<AuditLogEntry[]>(`/clients/${id}/audit-log`),
  getClientTxStats: (id: number) =>
    request<{ items: ClientTxStatRow[] }>(`/clients/${id}/tx-stats`),
  setClientActive: (id: number, active: boolean) =>
    request<{ ok: boolean; active: boolean }>(`/clients/${id}/active`, {
      method: "PATCH",
      body: JSON.stringify({ active }),
    }),

  // Remittances
  getRemittances: (params: {
    page?: number; limit?: number;
    client_id?: string; payer_id?: string;
    date_from?: string; date_to?: string;
    status?: string; partnership_id?: number;
  }) => {
    const p = new URLSearchParams();
    const limit = 10;
    const offset = ((params.page ?? 1) - 1) * limit;
    p.set("limit",  String(limit));
    p.set("offset", String(offset));
    if (params.client_id)    p.set("client_id",    params.client_id);
    if (params.payer_id)     p.set("payer_id",     params.payer_id);
    if (params.date_from)    p.set("date_from",    params.date_from);
    if (params.date_to)      p.set("date_to",      params.date_to);
    if (params.status)       p.set("status",       params.status);
    if (params.partnership_id) p.set("partnership_id", String(params.partnership_id));
    return request<{ total: number; items: RemittanceRecord[] }>(`/remittances?${p.toString()}`);
  },
  getRemittance: (id: string) =>
    request<RemittanceRecord>(`/remittances/${id}`),
  updateRemittanceStatus: (id: string, status: string) =>
    request<RemittanceRecord>(`/remittances/${id}/status`, {
      method: "PATCH", body: JSON.stringify({ status }),
    }),
  updateRemittancePayer: (id: string, payer_id: string) =>
    request<RemittanceRecord>(`/remittances/${id}/payer`, {
      method: "PATCH", body: JSON.stringify({ payer_id }),
    }),
  getRemittanceAuditLog: (id: string) =>
    request<RemittanceAuditEntry[]>(`/remittances/${id}/audit-log`),
};
