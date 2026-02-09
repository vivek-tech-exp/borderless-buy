"use client";

import { useState, useRef, useEffect } from "react";
import { useCurrency } from "@/app/lib/currency-context";
import type { CountryCode } from "@/types";
import { COUNTRY_CODES, COUNTRY_LABELS, COUNTRY_CURRENCY } from "@/types";

const COUNTRY_FLAGS: Record<CountryCode, string> = {
  US: "🇺🇸",
  UK: "🇬🇧",
  IN: "🇮🇳",
  AE: "🇦🇪",
  CN: "🇨🇳",
  KR: "🇰🇷",
  JP: "🇯🇵",
  DE: "🇩🇪",
  AU: "🇦🇺",
  HK: "🇭🇰",
};

export function CountryFlagSelector() {
  const { preferredCountry, setPreferredCountry } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group flex h-10 w-10 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 transition-all duration-200 hover:border-emerald-600 hover:bg-zinc-800"
        title={`${COUNTRY_LABELS[preferredCountry]} (${COUNTRY_CURRENCY[preferredCountry]})`}
        aria-label="Select country"
      >
        <span className="text-xl leading-none">{COUNTRY_FLAGS[preferredCountry]}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 z-50 w-56 rounded-[12px] border border-zinc-700 bg-zinc-900 p-2 shadow-[0_8px_16px_rgba(0,0,0,0.4)]">
          <div className="mb-2 px-2 py-1">
            <p className="text-xs font-medium text-zinc-400">Show prices in</p>
          </div>
          <div className="grid grid-cols-2 gap-1">
            {COUNTRY_CODES.map((code) => (
              <button
                key={code}
                onClick={() => {
                  setPreferredCountry(code);
                  setIsOpen(false);
                }}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  preferredCountry === code
                    ? "bg-emerald-600 text-white"
                    : "text-zinc-300 hover:bg-zinc-800"
                }`}
              >
                <span className="text-lg leading-none">{COUNTRY_FLAGS[code]}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{COUNTRY_LABELS[code]}</p>
                  <p className="text-[10px] opacity-75">{COUNTRY_CURRENCY[code]}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
