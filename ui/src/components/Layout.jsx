// src/components/Layout.jsx
import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";

export default function Layout({ children, theme }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const styles = {
    wrapper: {
      minHeight: "100vh",
      backgroundColor: theme.colors.background,
      fontFamily: theme.typography.fontFamily,
      display: "flex",
      flexDirection: "row",
    },
    sidebar: {
      width: "220px",
      backgroundColor: theme.colors.surface,
      borderRight: `1px solid ${theme.colors.divider}`,
      display: "flex",
      flexDirection: "column",
      padding: "1rem",
      transition: "transform 0.3s ease-in-out",
    },
    sidebarHidden: {
      transform: "translateX(-100%)",
      position: "absolute",
      top: 0,
      left: 0,
      height: "100%",
      zIndex: 50,
    },
    navItem: (active) => ({
      padding: "0.5rem 0.75rem",
      marginBottom: "0.5rem",
      borderRadius: "6px",
      textDecoration: "none",
      color: active ? theme.colors.primary : theme.colors.text.primary,
      backgroundColor: active ? theme.colors.primaryLight : "transparent",
      fontWeight: active ? "600" : "400",
    }),
    content: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      padding: "1.5rem",
    },
    header: {
      borderBottom: `1px solid ${theme.colors.divider}`,
      paddingBottom: "0.75rem",
      marginBottom: "1rem",
      fontSize: "1.25rem",
      fontWeight: "600",
      color: theme.colors.text.primary,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    mobileToggle: {
      display: "none",
      cursor: "pointer",
    },
    // NOTE: inline style objects don't support @media queries directly.
    // For responsive behavior, use Tailwind or CSS classes instead.
  };

  return (
    <div style={styles.wrapper}>
      {/* Sidebar Navigation */}
      <aside
        style={{
          ...styles.sidebar,
          ...(sidebarOpen ? {} : styles.sidebarHidden),
        }}
      >
        <h2 style={{ marginBottom: "1rem", fontWeight: "700" }}>Nexus Core</h2>
        <Link to="/" style={styles.navItem(location.pathname === "/")}>
          Dashboard
        </Link>
        <Link
          to="/executions"
          style={styles.navItem(location.pathname.startsWith("/executions"))}
        >
          Executions
        </Link>
        <Link
          to="/goals"
          style={styles.navItem(location.pathname.startsWith("/goals"))}
        >
          Goals
        </Link>
        <Link
          to="/audit"
          style={styles.navItem(location.pathname.startsWith("/audit"))}
        >
          Audit Logs
        </Link>
        <Link
          to="/streams"
          style={styles.navItem(location.pathname.startsWith("/streams"))}
        >
          Streams
        </Link>
        <Link
          to="/settings"
          style={styles.navItem(location.pathname.startsWith("/settings"))}
        >
          Settings
        </Link>
      </aside>

      {/* Main Content */}
      <main style={styles.content}>
        <div style={styles.header}>
          <span>
            {location.pathname === "/"
              ? "Dashboard"
              : location.pathname.replace("/", "").toUpperCase()}
          </span>
          <button
            style={styles.mobileToggle}
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            ☰
          </button>
        </div>
        {children}
      </main>
    </div>
  );
}