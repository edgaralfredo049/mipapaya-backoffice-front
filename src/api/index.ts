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
  active: boolean;
}

export interface AlternanciaSlotIn {
  country_id: string;
  pagador_id: string;
  hour_start: number;
  hour_end: number;
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
  amountToPay: number;
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${url}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
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
};
