// ── Types ─────────────────────────────────────────────────────────────────────

export interface BackofficePermission {
  id:        string;
  name:      string;
  can_write?: boolean;
}

export interface BackofficeRole {
  id:          string;
  name:        string;
  description: string | null;
  permissions: BackofficePermission[];
}

export interface BackofficeUser {
  id:         number;
  email:      string;
  name:       string | null;
  role_id:    string;
  role_name:  string | null;
  active:     boolean;
  created_at: string;
  updated_at: string;
}

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

export interface ClientRule {
  id: number;
  max_amount_usd: number;
  document_description: string;
  active: boolean;
  validate_doc_number: boolean;
  validate_name: boolean;
  validate_address: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClientRuleIn {
  max_amount_usd: number;
  document_description: string;
  active: boolean;
  validate_doc_number: boolean;
  validate_name: boolean;
  validate_address: boolean;
}

export interface ComplianceAlert {
  id: number;
  name: string;
  description: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ComplianceAlertIn {
  name: string;
  description: string;
  active: boolean;
}

export interface RemittanceRecord {
  id: string;
  created_at: string;
  client_id: string | null;
  origin_country_id: string | null;
  destination_country_id: string | null;
  sent_currency: string;
  pay_currency: string;
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
  sent_amount_usd: number | null;
  sent_amount_local: number | null;
  fee_usd: number | null;
  fee_local: number | null;
  delivered_usd: number | null;
  margen_fx_usd: number | null;
  fee_type: string | null;
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
  card_number_masked: string | null;
  sender_ip: string | null;
  alert_count: number;
  alert_summary: string | null;
  vault: "operations" | "compliance";
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
  postal_code?: string | null;
  birth_date?: string | null;
  occupation?: string | null;
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
    postal_code: string | null;
    birth_date: string | null;
    occupation: string | null;
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

export interface ChatLogMessage {
  text: string;
  sender: "user" | "bot";
  time: string;
  system?: boolean;
}

export interface HandoffRequest {
  id: string;
  session_id: string;
  client_phone: string | null;
  client_name: string | null;
  status: "pendiente" | "en_proceso" | "cerrado";
  agent_id: string | null;
  notes: string | null;
  created_at: string;
  opened_at: string | null;
  closed_at: string | null;
  unread_count?: number;
}

export interface ClientInteraction {
  id: number;
  client_id: number;
  type: "note" | "email";
  subject: string | null;
  content: string;
  created_by: string;
  created_at: string;
}

export interface ClientDocument {
  id: number;
  client_id: number;
  name: string;
  mime_type: string;
  uploaded_by: string;
  document_type: string | null;
  validation_status: "APPROVED" | "PENDING" | "REJECTED" | null;
  validation_summary: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export interface HandoffMessage {
  id: number;
  sender: "user" | "agent";
  text: string;
  created_at: string;
}

export interface HandoffNote {
  id: number;
  agent_id: string;
  text: string;
  created_at: string;
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
  entity_type: "client" | "beneficiary" | "document";
  entity_id: string;
  entity_label: string | null;
  changes: Record<string, { from: string | null; to: string | null } | string>;
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

const API_BASE = import.meta.env.VITE_API_URL ?? "";
const AGENT_ID = "admin@mipapaya.com";

function _getAuthHeader(): Record<string, string> {
  try {
    const raw = localStorage.getItem("mipapaya_auth");
    if (raw) {
      const state = JSON.parse(raw)?.state;
      if (state?.token) return { "Authorization": `Bearer ${state.token}` };
    }
  } catch { /* ignore */ }
  // Fallback: API key para compatibilidad durante transición
  const apiKey = import.meta.env.VITE_API_KEY ?? "";
  if (apiKey) return { "X-API-Key": apiKey };
  return {};
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/api${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ..._getAuthHeader(),
      ...(options?.headers ?? {}),
    },
  });

  // Token expirado → limpiar sesión y redirigir a login
  if (res.status === 401) {
    try {
      localStorage.removeItem("mipapaya_auth");
    } catch { /* ignore */ }
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
    const err = await res.json().catch(() => ({ detail: "Sesión expirada" }));
    throw new Error(err.detail || "Sesión expirada");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Error en la solicitud");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Auth API ──────────────────────────────────────────────────────────────────

export interface LoginResponse {
  token:        string;
  token_type:   string;
  expires_in:   number;
  user:         { id: number; email: string; name: string; role: string };
  permissions:  Array<{ id: string; name: string; can_write: boolean }>;
}

export interface ChallengeResponse {
  challenge:      true;
  challenge_name: string;
  session:        string;
}

async function requestPublic<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/api${url}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Error en la solicitud");
  }
  return res.json();
}

export const authApi = {
  login: (email: string, password: string) =>
    requestPublic<LoginResponse | ChallengeResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  respondChallenge: (session: string, challenge_name: string, email: string, new_password: string) =>
    requestPublic<LoginResponse | ChallengeResponse>("/auth/respond-challenge", {
      method: "POST",
      body: JSON.stringify({ session, challenge_name, email, new_password }),
    }),
  logout: (access_token?: string) =>
    request<{ ok: boolean }>("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ access_token }),
    }),
};

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

  // Compliance Alerts
  getComplianceAlerts: () => request<ComplianceAlert[]>("/compliance/alerts"),
  createComplianceAlert: (data: ComplianceAlertIn) =>
    request<ComplianceAlert>("/compliance/alerts", { method: "POST", body: JSON.stringify(data) }),
  updateComplianceAlert: (id: number, data: ComplianceAlertIn) =>
    request<ComplianceAlert>(`/compliance/alerts/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteComplianceAlert: (id: number) =>
    request<void>(`/compliance/alerts/${id}`, { method: "DELETE" }),

  // Client Rules
  getClientRules: () => request<ClientRule[]>("/client-rules"),
  createClientRule: (data: ClientRuleIn) =>
    request<ClientRule>("/client-rules", { method: "POST", body: JSON.stringify(data) }),
  updateClientRule: (id: number, data: ClientRuleIn) =>
    request<ClientRule>(`/client-rules/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteClientRule: (id: number) =>
    request<void>(`/client-rules/${id}`, { method: "DELETE" }),

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
    const limit = params.limit ?? 10;
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
  updateRemittanceVault: (id: string, vault: "operations" | "compliance", notes?: string) =>
    request<RemittanceRecord>(`/remittances/${id}/vault`, {
      method: "PATCH", body: JSON.stringify({ vault, notes }),
    }),
  complianceApprove: (id: string, notes?: string) =>
    request<RemittanceRecord>(`/remittances/${id}/compliance/approve`, {
      method: "POST", body: JSON.stringify({ notes }),
    }),
  complianceReject: (id: string, notes?: string) =>
    request<RemittanceRecord>(`/remittances/${id}/compliance/reject`, {
      method: "POST", body: JSON.stringify({ notes }),
    }),
  getVaultLogSummary: (date_from?: string, date_to?: string) => {
    const p = new URLSearchParams();
    if (date_from) p.set("date_from", date_from);
    if (date_to)   p.set("date_to",   date_to);
    return request<{ new_clients: number; escalated: number; approved: number; rejected: number }>(`/vault-log/summary?${p.toString()}`);
  },
  getRemittanceVaultLog: (id: string) =>
    request<{ id: string; vault_from: string | null; vault_to: string; escalation_type: string | null; changed_by: string | null; notes: string | null; created_at: string }[]>(`/remittances/${id}/vault-log`),
  getRemittanceAuditLog: (id: string) =>
    request<RemittanceAuditEntry[]>(`/remittances/${id}/audit-log`),
  getRemittanceChatLog: (id: string) =>
    request<{ remittance_id: string; messages: ChatLogMessage[] }>(`/remittances/${id}/chat-log`),

  // Handoff
  getHandoffPendingCount: () =>
    request<{ count: number }>(`/handoff/pending-count`),
  getHandoffRequests: (params: {
    status?: string; search?: string; date_from?: string; date_to?: string;
    agent_id?: string; limit?: number; offset?: number;
  }) => {
    const p = new URLSearchParams();
    if (params.status)    p.set("status",    params.status);
    if (params.search)    p.set("search",    params.search);
    if (params.date_from) p.set("date_from", params.date_from);
    if (params.date_to)   p.set("date_to",   params.date_to);
    if (params.agent_id)  p.set("agent_id",  params.agent_id);
    if (params.limit)     p.set("limit",     String(params.limit));
    if (params.offset)    p.set("offset",    String(params.offset));
    return request<{ total: number; items: HandoffRequest[] }>(`/handoff?${p.toString()}`);
  },
  getHandoffRequest: (id: string) =>
    request<HandoffRequest>(`/handoff/${id}`),
  updateHandoffStatus: (id: string, status: string, agent_id?: string) =>
    request<HandoffRequest>(`/handoff/${id}/status`, {
      method: "PATCH", body: JSON.stringify({ status, agent_id }),
    }),
  getHandoffNotes: (id: string) =>
    request<{ notes: HandoffNote[] }>(`/handoff/${id}/notes`),
  addHandoffNote: (id: string, text: string, agent_id = AGENT_ID) =>
    request<HandoffNote>(`/handoff/${id}/notes`, {
      method: "POST", body: JSON.stringify({ text, agent_id }),
    }),
  getHandoffMessages: (id: string, since_id?: number) => {
    const p = since_id ? `?since_id=${since_id}` : "";
    return request<{ messages: HandoffMessage[]; user_typing: boolean; status: string }>(`/handoff/${id}/messages${p}`);
  },
  postHandoffMessage: (id: string, text: string) =>
    request<{ id: number; sender: string; text: string }>(`/handoff/${id}/messages`, {
      method: "POST", body: JSON.stringify({ text, sender: "agent" }),
    }),
  setHandoffTyping: (id: string, sender = "agent") =>
    request<{ ok: boolean }>(`/handoff/${id}/typing?sender=${sender}`, { method: "POST" }),

  generateHandoffReport: (id: string) =>
    request<{ report_url: string }>(`/handoff/${id}/generate-report`, { method: "POST" }),

  // Client interactions
  getClientInteractions: (clientId: number) =>
    request<ClientInteraction[]>(`/clients/${clientId}/interactions`),
  addClientNote: (clientId: number, content: string) =>
    request<ClientInteraction>(`/clients/${clientId}/interactions/note`, {
      method: "POST", body: JSON.stringify({ content }),
    }),
  sendClientEmail: (clientId: number, to: string, subject: string, html: string) =>
    request<ClientInteraction>(`/clients/${clientId}/interactions/email`, {
      method: "POST", body: JSON.stringify({ to, subject, html }),
    }),

  // Documents
  getClientDocuments: (clientId: number) =>
    request<ClientDocument[]>(`/clients/${clientId}/documents`),
  uploadClientDocument: async (clientId: number, file: File, documentType?: string): Promise<ClientDocument> => {
    // 1. Obtener URL pre-firmada de S3
    const params = new URLSearchParams({
      filename: file.name,
      content_type: file.type || "application/octet-stream",
    });
    const urlRes = await fetch(`${API_BASE}/api/clients/${clientId}/documents/upload-url?${params}`, {
      headers: { ..._getAuthHeader() },
    });
    if (!urlRes.ok) throw new Error("Error obteniendo URL de subida");
    const { upload_url, s3_key } = await urlRes.json();

    // 2. Subir el archivo directamente a S3
    const s3Res = await fetch(upload_url, {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    if (!s3Res.ok) throw new Error("Error subiendo archivo a S3");

    // 3. Confirmar en el backend y guardar metadata
    const confirmRes = await fetch(`${API_BASE}/api/clients/${clientId}/documents`, {
      method: "POST",
      headers: { ..._getAuthHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({
        s3_key,
        filename: file.name,
        content_type: file.type || "application/octet-stream",
        document_type: documentType ?? null,
      }),
    });
    if (!confirmRes.ok) throw new Error("Error registrando documento");
    return confirmRes.json();
  },
  fetchDocumentBlob: async (clientId: number, docId: number): Promise<Blob> => {
    const res = await fetch(`${API_BASE}/api/clients/${clientId}/documents/${docId}/file`, {
      headers: { ..._getAuthHeader() },
      redirect: "follow",
    });
    if (!res.ok) throw new Error("Archivo no encontrado");
    return res.blob();
  },
  deleteClientDocument: (clientId: number, docId: number) =>
    request<void>(`/clients/${clientId}/documents/${docId}`, { method: "DELETE" }),
  updateDocumentStatus: (clientId: number, docId: number, status: "APPROVED" | "PENDING" | "REJECTED", user: string, rejection_reason?: string | null) =>
    request<ClientDocument>(`/clients/${clientId}/documents/${docId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, user, rejection_reason }),
    }),

  // Backoffice users (superusuario only)
  listBackofficeUsers: () =>
    request<{ items: BackofficeUser[] }>("/users"),
  createBackofficeUser: (data: { email: string; name: string; role_id: string }) =>
    request<BackofficeUser>("/users", { method: "POST", body: JSON.stringify(data) }),
  updateBackofficeUser: (id: number, data: { name?: string; role_id?: string; active?: boolean }) =>
    request<BackofficeUser>(`/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deactivateBackofficeUser: (id: number) =>
    request<void>(`/users/${id}`, { method: "DELETE" }),
  resetUserPassword: (id: number) =>
    request<void>(`/users/${id}/reset-password`, { method: "POST" }),

  listRoles: () =>
    request<{ items: BackofficeRole[] }>("/roles"),
  listPermissions: () =>
    request<{ items: BackofficePermission[] }>("/permissions"),
  updateRolePermissions: (roleId: string, permissions: Array<{ permission_id: string; can_write: boolean }>) =>
    request<BackofficeRole>(`/roles/${roleId}/permissions`, {
      method: "PUT",
      body: JSON.stringify({ permissions }),
    }),
};
