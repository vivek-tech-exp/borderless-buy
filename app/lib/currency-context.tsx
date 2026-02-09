"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { CurrencyCode, CountryCode } from "@/types";
import { COUNTRY_CURRENCY, COUNTRY_CODES } from "@/types";
import { convert, formatCurrency } from "@/app/lib/utils";
import { PREFERRED_CURRENCY_KEY } from "@/app/lib/constants";

interface RatesState {
  rates: Record<string, number>;
  updatedAt: string | null;
  error: boolean;
}

interface CurrencyContextValue {
  preferredCountry: CountryCode;
  preferredCurrency: CurrencyCode;
  setPreferredCountry: (c: CountryCode) => void;
  rates: RatesState;
  convertToPreferred: (amount: number, fromCurrency: string) => number;
  formatInPreferred: (amount: number, fromCurrency: string) => string;
}

const defaultRates: RatesState = {
  rates: {},
  updatedAt: null,
  error: false,
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

const STORAGE_KEY = PREFERRED_CURRENCY_KEY;
const DEFAULT_COUNTRY: CountryCode = "US";

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [preferredCountry, setPreferredCountryState] =
    useState<CountryCode>(DEFAULT_COUNTRY);
  const [rates, setRates] = useState<RatesState>(defaultRates);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as CountryCode | null;
    if (stored && COUNTRY_CODES.includes(stored)) {
      setPreferredCountryState(stored);
      return;
    }

    // Auto-detect country from IP if no stored preference
    fetch("https://ipapi.co/json/")
      .then((res) => res.json())
      .then((data) => {
        const countryCode = data.country_code as string;
        // Map common country codes to our supported ones
        const countryMap: Record<string, CountryCode> = {
          US: "US",
          GB: "UK",
          IN: "IN",
          AE: "AE",
          CN: "CN",
          KR: "KR",
          JP: "JP",
          DE: "DE",
          AU: "AU",
          HK: "HK",
        };
        const detected = countryMap[countryCode];
        if (detected) {
          setPreferredCountryState(detected);
        }
      })
      .catch(() => {
        // Silently fall back to DEFAULT_COUNTRY if detection fails
      });
  }, []);

  const setPreferredCountry = useCallback((c: CountryCode) => {
    setPreferredCountryState(c);
    localStorage.setItem(STORAGE_KEY, c);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/rates")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Rates failed"))))
      .then((data) => {
        if (cancelled) return;
        setRates({
          rates: data.rates ?? {},
          updatedAt: data.updatedAt ?? null,
          error: false,
        });
      })
      .catch(() => {
        if (!cancelled) setRates((r) => ({ ...r, error: true }));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const convertToPreferred = useCallback(
    (amount: number, fromCurrency: string): number => {
      const preferredCurrency = COUNTRY_CURRENCY[preferredCountry];
      if (!rates.rates[fromCurrency] || !rates.rates[preferredCurrency])
        return amount;
      return convert(amount, fromCurrency, preferredCurrency, rates.rates);
    },
    [rates.rates, preferredCountry]
  );

  const formatInPreferred = useCallback(
    (amount: number, fromCurrency: string): string => {
      const converted = convertToPreferred(amount, fromCurrency);
      const preferredCurrency = COUNTRY_CURRENCY[preferredCountry];
      return formatCurrency(converted, preferredCurrency);
    },
    [convertToPreferred, preferredCountry]
  );

  const value: CurrencyContextValue = {
    preferredCountry,
    preferredCurrency: COUNTRY_CURRENCY[preferredCountry],
    setPreferredCountry,
    rates,
    convertToPreferred,
    formatInPreferred,
  };

  return (
    <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
