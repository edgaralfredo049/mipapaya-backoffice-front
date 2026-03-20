// ── Types ─────────────────────────────────────────────────────────────────────

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
    bank_deposit: PaymentMethodData;
    cash_pickup: PaymentMethodData;
    mobile_money: PaymentMethodData;
    wallet: PaymentMethodData;
  };
  created_at: string;
}

export interface RateIn {
  name: string;
  status: string;
  payment_methods: Record<string, { commissions: CommissionRow[] }>;
}

export interface AlternanciaSlot {
  id: string;
  country_id: string;
  pagador_id: string;
  hour_start: number;
  hour_end: number;
  amount_min: number;
  amount_max: number;
  payment_methods: string[];
  active: boolean;
}

export interface AlternanciaSlotIn {
  country_id: string;
  pagador_id: string;
  hour_start: number;
  hour_end: number;
  amount_min: number;
  amount_max: number;
  payment_methods: string[];
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

export interface ClientDetail {
  id: number;
  phone: string;
  kyc_valid: boolean;
  created_at: string;
  personal: {
    doc_id: string | null;
    id_type: string | null;
    id_type_label: string;
    name: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    email: string | null;
  };
  kyc: {
    verification_result: string | null;
    kyc_created_at: string | null;
    document_front: string | null;
    document_back: string | null;
    selfie: string | null;
  };
}

export interface ClientsFilters {
  name?: string;
  email?: string;
  phone?: string;
  date_from?: string;
  date_to?: string;
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
    completeResponse?: boolean;
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
};
