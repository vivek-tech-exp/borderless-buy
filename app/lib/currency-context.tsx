"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { CurrencyCode } from "@/types";
import { convert, formatCurrency } from "@/app/lib/utils";
import { PREFERRED_CURRENCY_KEY } from "@/app/lib/constants";

interface RatesState {
  rates: Record<string, number>;
  updatedAt: string | null;
  error: boolean;
}

interface CurrencyContextValue {
  preferredCurrency: CurrencyCode;
  setPreferredCurrency: (c: CurrencyCode) => void;
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
const DEFAULT_CURRENCY: CurrencyCode = "INR";

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [preferredCurrency, setPreferredCurrencyState] =
    useState<CurrencyCode>(DEFAULT_CURRENCY);
  const [rates, setRates] = useState<RatesState>(defaultRates);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as CurrencyCode | null;
    if (stored && ["INR", "NPR", "USD", "AED", "CNY", "KRW", "EUR", "GBP"].includes(stored)) {
      setPreferredCurrencyState(stored);
    }
  }, []);

  const setPreferredCurrency = useCallback((c: CurrencyCode) => {
    setPreferredCurrencyState(c);
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
      if (!rates.rates[fromCurrency] || !rates.rates[preferredCurrency])
        return amount;
      return convert(amount, fromCurrency, preferredCurrency, rates.rates);
    },
    [rates.rates, preferredCurrency]
  );

  const formatInPreferred = useCallback(
    (amount: number, fromCurrency: string): string => {
      const converted = convertToPreferred(amount, fromCurrency);
      return formatCurrency(converted, preferredCurrency);
    },
    [convertToPreferred, preferredCurrency]
  );

  const value: CurrencyContextValue = {
    preferredCurrency,
    setPreferredCurrency,
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
