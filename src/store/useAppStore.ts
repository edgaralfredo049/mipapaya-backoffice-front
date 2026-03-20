import { create } from "zustand";
import { api, Country, Currency, State, Gateway, Pagador, Rate, AlternanciaSlot, GatewayAlternanciaSlot, ExchangeRate, Tariff } from "../api";

interface AppState {
  isLoaded: boolean;
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

    const [countries, currencies, states, gateways, pagadores, rates, alternancia, gatewayAlternancia, exchangeRates, tariffs] = await Promise.all([
      safe(api.getCountries(), []),
      safe(api.getCurrencies(), []),
      safe(api.getStates(), []),
      safe(api.getGateways(), []),
      safe(api.getPagadores(), []),
      safe(api.getRates(), []),
      safe(api.getAlternancia(), []),
      safe(api.getGatewayAlternancia(), []),
      safe(api.getExchangeRates(), []),
      safe(api.getTariffs(), []),
    ]);
    set({ countries, currencies, states, gateways, pagadores, rates, alternancia, gatewayAlternancia, exchangeRates, tariffs, isLoaded: true });
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
