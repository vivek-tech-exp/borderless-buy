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
      <button
        type="button"
        onClick={() => onToggle(isGlobal ? "local" : "global")}
        className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl border transition-all duration-200"
        style={{
          backgroundColor: isGlobal ? 'var(--bg-secondary)' : 'var(--bg-secondary)',
          borderColor: isGlobal ? 'var(--accent-primary)' : 'var(--border-primary)',
          color: isGlobal ? 'var(--accent-primary)' : 'var(--text-secondary)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--accent-primary)';
          e.currentTarget.style.color = 'var(--accent-primary)';
        }}
        onMouseLeave={(e) => {
          if (isGlobal) {
            e.currentTarget.style.borderColor = 'var(--accent-primary)';
            e.currentTarget.style.color = 'var(--accent-primary)';
          } else {
            e.currentTarget.style.borderColor = 'var(--border-primary)';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }
        }}
        title={isGlobal ? "Switch to local prices only" : "Switch to global comparison"}
      >
        {isGlobal ? (
          <>
            <GlobeAltIcon className="w-4 h-4" />
            <span className="text-sm font-medium">Global View</span>
          </>
        ) : (
          <>
            <HomeIcon className="w-4 h-4" />
            <span className="text-sm font-medium">{countryLabel} Only</span>
          </>
        )}
        <span className="text-xs opacity-70">•</span>
        <span className="text-xs opacity-70">
          {isGlobal ? `Tap for ${countryLabel} view` : "Tap for Global view"}
        </span>
      </button>
    </div>
  );
}
