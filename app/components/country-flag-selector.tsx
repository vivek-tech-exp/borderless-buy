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
        className="group flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-200"
        title={`${COUNTRY_LABELS[preferredCountry]} (${COUNTRY_CURRENCY[preferredCountry]})`}
        aria-label="Select country"
        style={{
          borderColor: 'var(--border-primary)',
          backgroundColor: 'var(--bg-secondary)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--accent-primary)';
          e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-primary)';
          e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
        }}
      >
        <span className="text-xl leading-none">{COUNTRY_FLAGS[preferredCountry]}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 z-50 w-56 rounded-[12px] border p-2 shadow-lg" style={{borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-primary)'}}>
          <div className="mb-2 px-2 py-1">
            <p className="text-xs font-medium" style={{color: 'var(--text-secondary)'}}>Show prices in</p>
          </div>
          <div className="grid grid-cols-2 gap-1">
            {COUNTRY_CODES.map((code) => (
              <button
                key={code}
                onClick={() => {
                  setPreferredCountry(code);
                  setIsOpen(false);
                }}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors"
                style={preferredCountry === code ? {
                  backgroundColor: 'var(--accent-primary)',
                  color: 'var(--text-inverse)',
                } : {
                  backgroundColor: 'transparent',
                  color: 'var(--text-secondary)',
                }}
                onMouseEnter={(e) => {
                  if (preferredCountry !== code) {
                    e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (preferredCountry !== code) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="text-lg leading-none">{COUNTRY_FLAGS[code]}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{COUNTRY_LABELS[code]}</p>
                  <p className="text-[10px]" style={{opacity: 0.75}}>{COUNTRY_CURRENCY[code]}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
