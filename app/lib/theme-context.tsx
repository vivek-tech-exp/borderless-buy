"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Theme, darkTheme, lightTheme, ThemeColors } from "@/app/lib/theme-config";

interface ThemeContextType {
  theme: Theme;
  colors: ThemeColors;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  // Hydrate theme from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("theme") as Theme | null;
    const initial = saved || "light";
    setThemeState(initial);
    applyTheme(initial);
    setMounted(true);
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("theme", newTheme);
    applyTheme(newTheme);
  };

  const applyTheme = (themeToApply: Theme) => {
    const colors = themeToApply === "light" ? lightTheme : darkTheme;
    const root = document.documentElement;

    // Apply all CSS variables
    // Backgrounds
    root.style.setProperty("--bg-primary", colors.background.primary);
    root.style.setProperty("--bg-secondary", colors.background.secondary);
    root.style.setProperty("--bg-tertiary", colors.background.tertiary);

    // Text
    root.style.setProperty("--text-primary", colors.text.primary);
    root.style.setProperty("--text-secondary", colors.text.secondary);
    root.style.setProperty("--text-tertiary", colors.text.tertiary);
    root.style.setProperty("--text-inverse", colors.text.inverse);

    // Borders
    root.style.setProperty("--border-primary", colors.border.primary);
    root.style.setProperty("--border-secondary", colors.border.secondary);

    // Accent
    root.style.setProperty("--accent-primary", colors.accent.primary);
    root.style.setProperty("--accent-hover", colors.accent.hover);
    root.style.setProperty("--accent-active", colors.accent.active);
    root.style.setProperty("--accent-light", colors.accent.light);

    // Button primary
    root.style.setProperty("--btn-primary-bg", colors.button.primary.bg);
    root.style.setProperty("--btn-primary-text", colors.button.primary.text);
    root.style.setProperty("--btn-primary-hover", colors.button.primary.hover);
    root.style.setProperty("--btn-primary-active", colors.button.primary.active);
    root.style.setProperty("--btn-primary-disabled", colors.button.primary.disabled);

    // Button secondary
    root.style.setProperty("--btn-secondary-bg", colors.button.secondary.bg);
    root.style.setProperty("--btn-secondary-text", colors.button.secondary.text);
    root.style.setProperty("--btn-secondary-hover", colors.button.secondary.hover);
    root.style.setProperty("--btn-secondary-active", colors.button.secondary.active);
    root.style.setProperty("--btn-secondary-border", colors.button.secondary.border);

    // Input
    root.style.setProperty("--input-bg", colors.input.bg);
    root.style.setProperty("--input-border", colors.input.border);
    root.style.setProperty("--input-border-focus", colors.input.borderFocus);
    root.style.setProperty("--input-text", colors.input.text);
    root.style.setProperty("--input-placeholder", colors.input.placeholder);
    root.style.setProperty("--input-ring", colors.input.ring);

    // Card
    root.style.setProperty("--card-bg", colors.card.bg);
    root.style.setProperty("--card-border", colors.card.border);
    root.style.setProperty("--card-hover", colors.card.hover);

    // Status colors
    root.style.setProperty("--status-success-bg", colors.status.success.bg);
    root.style.setProperty("--status-success-text", colors.status.success.text);
    root.style.setProperty("--status-success-border", colors.status.success.border);

    root.style.setProperty("--status-warning-bg", colors.status.warning.bg);
    root.style.setProperty("--status-warning-text", colors.status.warning.text);
    root.style.setProperty("--status-warning-border", colors.status.warning.border);

    root.style.setProperty("--status-error-bg", colors.status.error.bg);
    root.style.setProperty("--status-error-text", colors.status.error.text);
    root.style.setProperty("--status-error-border", colors.status.error.border);

    root.style.setProperty("--status-info-bg", colors.status.info.bg);
    root.style.setProperty("--status-info-text", colors.status.info.text);
    root.style.setProperty("--status-info-border", colors.status.info.border);

    // Special
    root.style.setProperty("--overlay", colors.overlay);
    root.style.setProperty("--divider", colors.divider);
  };

  const colors = theme === "light" ? lightTheme : darkTheme;

  return (
    <ThemeContext.Provider value={{ theme, colors, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
