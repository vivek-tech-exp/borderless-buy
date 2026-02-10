"use client";

import { GlobeAltIcon, HomeIcon } from "@heroicons/react/24/outline";

export type ViewMode = "local" | "global";

interface ViewModeToggleProps {
  mode: ViewMode;
  onToggle: (mode: ViewMode) => void;
  countryLabel: string;
}

export function ViewModeToggle({ mode, onToggle, countryLabel }: ViewModeToggleProps) {
  const isGlobal = mode === "global";

  return (
    <div className="flex items-center justify-center sm:justify-start">
      <div
        className="inline-flex items-center rounded-full border p-1"
        style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-secondary)' }}
        aria-label="Pricing view"
      >
        <button
          type="button"
          onClick={() => onToggle("global")}
          className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-all"
          style={{
            backgroundColor: isGlobal ? 'var(--accent-primary)' : 'transparent',
            color: isGlobal ? 'white' : 'var(--text-secondary)',
            boxShadow: isGlobal ? '0 6px 16px rgba(0,0,0,0.15)' : 'none',
          }}
          title="Compare worldwide prices"
        >
          <GlobeAltIcon className="h-4 w-4" />
          Global
        </button>
        <button
          type="button"
          onClick={() => onToggle("local")}
          className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-all"
          style={{
            backgroundColor: !isGlobal ? 'var(--accent-primary)' : 'transparent',
            color: !isGlobal ? 'white' : 'var(--text-secondary)',
            boxShadow: !isGlobal ? '0 6px 16px rgba(0,0,0,0.15)' : 'none',
          }}
          title={`Show ${countryLabel} prices only`}
        >
          <HomeIcon className="h-4 w-4" />
          {countryLabel}
        </button>
      </div>
    </div>
  );
}
