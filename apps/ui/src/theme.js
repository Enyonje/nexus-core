// src/theme.js
export const lightTheme = {
  colors: {
    primary: "#2563eb",
    secondary: "#9333ea",
    background: "#f9fafb",
    surface: "#ffffff",
    text: { primary: "#111827", secondary: "#6b7280" },
    success: "#10b981",
    error: "#ef4444",
    warning: "#f59e0b",
  },
  spacing: { xs: "4px", sm: "8px", md: "16px", lg: "24px", xl: "32px" },
  typography: {
    fontFamily: "'Inter', sans-serif",
    h1: "2rem",
    h2: "1.5rem",
    h3: "1.25rem",
    body: "1rem",
    small: "0.875rem",
  },
};

export const darkTheme = {
  ...lightTheme,
  colors: {
    ...lightTheme.colors,
    background: "#111827",
    surface: "#1f2937",
    text: { primary: "#f9fafb", secondary: "#d1d5db" },
  },
};