// src/components/Layout.jsx
import React from "react";
import { theme } from "../theme";

export function Layout({ children }) {
  const styles = {
    minHeight: "100vh",
    backgroundColor: theme.colors.background,
    fontFamily: theme.typography.fontFamily,
    display: "flex",
    flexDirection: "column",
  };

  return <div style={styles}>{children}</div>;
}