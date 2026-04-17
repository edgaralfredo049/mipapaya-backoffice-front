import { create } from "zustand";
import { api, Country, Currency, State, Gateway, Pagador, Rate, AlternanciaSlot, GatewayAlternanciaSlot, ExchangeRate, Tariff, Partnership } from "../api";

interface AppState {
  isLoaded: boolean;
  partnerships: Partnership[];
  countries: Country[];
  currencies: Currency[];
  states: State[];
  gateways: Gateway[];
  pagadores: Pagador[];
  rates: Rate[];
  alternancia: AlternanciaSlot[];
  gatewayAlternancia: GatewayAlternanciaSlot[];
  exchangeRates: ExchangeRate[];
  tariffs: Tariff[];

  init: () => Promise<void>;
  refreshPartnerships: () => Promise<void>;
  refreshCountries: () => Promise<void>;
  refreshGateways: () => Promise<void>;
  refreshPagadores: () => Promise<void>;
  refreshRates: () => Promise<void>;
  refreshAlternancia: () => Promise<void>;
  refreshGatewayAlternancia: () => Promise<void>;
  refreshExchangeRates: () => Promise<void>;
  refreshTariffs: () => Promise<void>;
}

export const useAppStore = create<AppState>()((set) => ({
  isLoaded: false,
  partnerships: [],
  countries: [],
  currencies: [],
  states: [],
  gateways: [],
  pagadores: [],
  rates: [],
  alternancia: [],
  gatewayAlternancia: [],
  exchangeRates: [],
  tariffs: [],

  init: async () => {
    const safe = <T>(p: Promise<T>, fallback: T): Promise<T> =>
      p.catch((e) => { console.error(e); return fallback; });

    // Only load data needed across multiple pages — page-specific data loads lazily
    const [partnerships, countries, currencies, states, gateways, pagadores] = await Promise.all([
      safe(api.getPartnerships(), []),
      safe(api.getCountries(), []),
      safe(api.getCurrencies(), []),
      safe(api.getStates(), []),
      safe(api.getGateways(), []),
      safe(api.getPagadores(), []),
    ]);
    set({ partnerships, countries, currencies, states, gateways, pagadores, isLoaded: true });
  },

  refreshPartnerships: async () => {
    const partnerships = await api.getPartnerships();
    set({ partnerships });
  },

  refreshCountries: async () => {
    const countries = await api.getCountries();
    set({ countries });
  },

  refreshGateways: async () => {
    const gateways = await api.getGateways();
    set({ gateways });
  },

  refreshPagadores: async () => {
    const pagadores = await api.getPagadores();
    set({ pagadores });
  },

  refreshRates: async () => {
    const rates = await api.getRates();
    set({ rates });
  },

  refreshAlternancia: async () => {
    const alternancia = await api.getAlternancia();
    set({ alternancia });
  },

  refreshGatewayAlternancia: async () => {
    const gatewayAlternancia = await api.getGatewayAlternancia();
    set({ gatewayAlternancia });
  },

  refreshExchangeRates: async () => {
    const exchangeRates = await api.getExchangeRates();
    set({ exchangeRates });
  },

  refreshTariffs: async () => {
    const tariffs = await api.getTariffs();
    set({ tariffs });
  },
}));
