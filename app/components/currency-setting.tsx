"use client";

import { useCurrency } from "@/app/lib/currency-context";
import type { CountryCode } from "@/types";
import { COUNTRY_CODES, COUNTRY_LABELS, COUNTRY_CURRENCY } from "@/types";

export function CurrencySetting() {
  const { preferredCountry, setPreferredCountry } = useCurrency();

  return (
    <select
      id="country-select"
      value={preferredCountry}
      onChange={(e) =>
        setPreferredCountry(e.target.value as CountryCode)
      }
      className="w-full rounded-[12px] border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-white transition-all duration-200 focus-visible:outline-none focus-visible:border-emerald-600 focus-visible:ring-4 focus-visible:ring-emerald-500/20 focus-visible:ring-offset-0 cursor-pointer hover:border-zinc-600"
    >
      {COUNTRY_CODES.map((code) => (
        <option key={code} value={code}>
          {COUNTRY_LABELS[code]} ({COUNTRY_CURRENCY[code]})
        </option>
      ))}
    </select>
  );
}
