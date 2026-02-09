export type Theme = "light" | "dark";

export interface ThemeColors {
  // Backgrounds
  background: {
    primary: string;
    secondary: string;
    tertiary: string;
  };
  
  // Text colors
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    inverse: string;
  };
  
  // Borders
  border: {
    primary: string;
    secondary: string;
  };
  
  // Accent/Primary brand color
  accent: {
    primary: string;
    hover: string;
    active: string;
    light: string;
  };
  
  // Button states
  button: {
    primary: {
      bg: string;
      text: string;
      hover: string;
      active: string;
      disabled: string;
    };
    secondary: {
      bg: string;
      text: string;
      hover: string;
      active: string;
      border: string;
    };
  };
  
  // Input fields
  input: {
    bg: string;
    border: string;
    borderFocus: string;
    text: string;
    placeholder: string;
    ring: string;
  };
  
  // Cards and sections
  card: {
    bg: string;
    border: string;
    hover: string;
  };
  
  // Status colors
  status: {
    success: {
      bg: string;
      text: string;
      border: string;
    };
    warning: {
      bg: string;
      text: string;
      border: string;
    };
    error: {
      bg: string;
      text: string;
      border: string;
    };
    info: {
      bg: string;
      text: string;
      border: string;
    };
  };
  
  // Special
  overlay: string;
  divider: string;
}

export const lightTheme: ThemeColors = {
  background: {
    primary: "#ffffff",
    secondary: "#f8f8f8",
    tertiary: "#f0f0f0",
  },
  text: {
    primary: "#1a1a1a",
    secondary: "#666666",
    tertiary: "#999999",
    inverse: "#ffffff",
  },
  border: {
    primary: "#e5e5e5",
    secondary: "#d9d9d9",
  },
  accent: {
    primary: "#059669",
    hover: "#047857",
    active: "#065f46",
    light: "#d1fae5",
  },
  button: {
    primary: {
      bg: "#059669",
      text: "#ffffff",
      hover: "#047857",
      active: "#065f46",
      disabled: "#d1d5db",
    },
    secondary: {
      bg: "#f3f4f6",
      text: "#1a1a1a",
      hover: "#e5e7eb",
      active: "#d1d5db",
      border: "#d1d5db",
    },
  },
  input: {
    bg: "#ffffff",
    border: "#d9d9d9",
    borderFocus: "#059669",
    text: "#1a1a1a",
    placeholder: "#9ca3af",
    ring: "#d1fae5",
  },
  card: {
    bg: "#ffffff",
    border: "#e5e5e5",
    hover: "#f8f8f8",
  },
  status: {
    success: {
      bg: "#ecfdf5",
      text: "#065f46",
      border: "#a7f3d0",
    },
    warning: {
      bg: "#fffbeb",
      text: "#92400e",
      border: "#fcd34d",
    },
    error: {
      bg: "#fef2f2",
      text: "#991b1b",
      border: "#fca5a5",
    },
    info: {
      bg: "#eff6ff",
      text: "#1e40af",
      border: "#93c5fd",
    },
  },
  overlay: "rgba(0, 0, 0, 0.5)",
  divider: "#f3f4f6",
};

export const darkTheme: ThemeColors = {
  background: {
    primary: "#0a0a0a",
    secondary: "#1a1a1a",
    tertiary: "#2a2a2a",
  },
  text: {
    primary: "#fafafa",
    secondary: "#d4d4d4",
    tertiary: "#a0a0a0",
    inverse: "#0a0a0a",
  },
  border: {
    primary: "#3a3a3a",
    secondary: "#2a2a2a",
  },
  accent: {
    primary: "#10b981",
    hover: "#059669",
    active: "#047857",
    light: "#d1fae5",
  },
  button: {
    primary: {
      bg: "#10b981",
      text: "#ffffff",
      hover: "#059669",
      active: "#047857",
      disabled: "#4b5563",
    },
    secondary: {
      bg: "#2a2a2a",
      text: "#fafafa",
      hover: "#3a3a3a",
      active: "#4a4a4a",
      border: "#3a3a3a",
    },
  },
  input: {
    bg: "#1a1a1a",
    border: "#3a3a3a",
    borderFocus: "#10b981",
    text: "#fafafa",
    placeholder: "#6b7280",
    ring: "#10b98133",
  },
  card: {
    bg: "#1a1a1a",
    border: "#3a3a3a",
    hover: "#2a2a2a",
  },
  status: {
    success: {
      bg: "#064e3b",
      text: "#d1fae5",
      border: "#047857",
    },
    warning: {
      bg: "#78350f",
      text: "#fef3c7",
      border: "#b45309",
    },
    error: {
      bg: "#7f1d1d",
      text: "#fecaca",
      border: "#dc2626",
    },
    info: {
      bg: "#1e3a8a",
      text: "#93c5fd",
      border: "#3b82f6",
    },
  },
  overlay: "rgba(0, 0, 0, 0.7)",
  divider: "#1a1a1a",
};
