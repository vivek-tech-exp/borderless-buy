"use client";

import { useCurrency } from "@/app/lib/currency-context";
import type { CountryCode } from "@/types";
import { COUNTRY_CODES, COUNTRY_LABELS, COUNTRY_CURRENCY } from "@/types";

export function CurrencySetting() {
  const { preferredCountry, setPreferredCountry, rates } = useCurrency();

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor="currency-select"
        className="text-xs font-medium text-zinc-500"
      >
        View prices in
      </label>
      <select
        id="country-select"
        value={preferredCountry}
        onChange={(e) =>
          setPreferredCountry(e.target.value as CountryCode)
        }
        className="rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      >
        {COUNTRY_CODES.map((code) => (
          <option key={code} value={code}>
            {COUNTRY_LABELS[code]}
          </option>
        ))}
      </select>
      <p className="text-[10px] text-zinc-600">Currency: <span className="font-medium">{COUNTRY_CURRENCY[preferredCountry]}</span></p>
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
