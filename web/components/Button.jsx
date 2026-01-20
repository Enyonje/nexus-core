// src/components/Button.jsx
import React from "react";
import { theme } from "../theme";

export function Button({ children, variant = "primary", ...props }) {
  const styles = {
    backgroundColor:
      variant === "primary" ? theme.colors.primary : theme.colors.secondary,
    color: "#fff",
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body,
    transition: "background-color 0.2s ease",
  };

  return (
    <button style={styles} {...props}>
      {children}
    </button>
  );
}