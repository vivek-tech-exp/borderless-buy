"use client";

import { useCurrency } from "@/app/lib/currency-context";
import type { CurrencyCode } from "@/types";
import { CURRENCY_CODES } from "@/types";
import { CURRENCY_LABELS } from "@/app/lib/constants";

export function CurrencySetting() {
  const { preferredCurrency, setPreferredCurrency, rates } = useCurrency();

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor="currency-select"
        className="text-xs font-medium text-zinc-500"
      >
        Display currency
      </label>
      <select
        id="currency-select"
        value={preferredCurrency}
        onChange={(e) =>
          setPreferredCurrency(e.target.value as CurrencyCode)
        }
        className="rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      >
        {CURRENCY_CODES.map((code) => (
          <option key={code} value={code}>
            {CURRENCY_LABELS[code] ?? code}
          </option>
        ))}
      </select>
      {rates.updatedAt && (
        <p className="text-[10px] text-zinc-600">
          Rates updated {new Date(rates.updatedAt).toLocaleDateString()}
        </p>
      )}
      {rates.error && (
        <p className="text-[10px] text-amber-500">Rates unavailable</p>
      )}
    </div>
  );
}
