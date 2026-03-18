import { create } from "zustand";
import { api, Country, Currency, State, Gateway, Pagador, Rate, AlternanciaSlot, ExchangeRate } from "../api";

interface AppState {
  isLoaded: boolean;
  countries: Country[];
  currencies: Currency[];
  states: State[];
  gateways: Gateway[];
  pagadores: Pagador[];
  rates: Rate[];
  alternancia: AlternanciaSlot[];
  exchangeRates: ExchangeRate[];

  init: () => Promise<void>;
  refreshCountries: () => Promise<void>;
  refreshGateways: () => Promise<void>;
  refreshPagadores: () => Promise<void>;
  refreshRates: () => Promise<void>;
  refreshAlternancia: () => Promise<void>;
  refreshExchangeRates: () => Promise<void>;
}

export const useAppStore = create<AppState>()((set) => ({
  isLoaded: false,
  countries: [],
  currencies: [],
  states: [],
  gateways: [],
  pagadores: [],
  rates: [],
  alternancia: [],
  exchangeRates: [],

  init: async () => {
    const safe = <T>(p: Promise<T>, fallback: T): Promise<T> =>
      p.catch((e) => { console.error(e); return fallback; });

    const [countries, currencies, states, gateways, pagadores, rates, alternancia, exchangeRates] = await Promise.all([
      safe(api.getCountries(), []),
      safe(api.getCurrencies(), []),
      safe(api.getStates(), []),
      safe(api.getGateways(), []),
      safe(api.getPagadores(), []),
      safe(api.getRates(), []),
      safe(api.getAlternancia(), []),
      safe(api.getExchangeRates(), []),
    ]);
    set({ countries, currencies, states, gateways, pagadores, rates, alternancia, exchangeRates, isLoaded: true });
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

  refreshExchangeRates: async () => {
    const exchangeRates = await api.getExchangeRates();
    set({ exchangeRates });
  },
}));
