// src/components/Navbar.jsx
import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth"; // ✅ import the hook

export default function Navbar({ onToggleTheme, isDark, theme }) {
  // ✅ use the hook to access auth state
  const { user, subscription, logout } = useAuth();

  const styles = {
    wrapper: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "0.75rem 1.5rem",
      backgroundColor: theme?.colors?.surface || "#0f172a",
      borderBottom: `1px solid ${theme?.colors?.divider || "#1e293b"}`,
    },
    brand: {
      fontWeight: "700",
      fontSize: "1.25rem",
      color: theme?.colors?.primary || "#38bdf8",
      textDecoration: "none",
    },
    actions: {
      display: "flex",
      alignItems: "center",
      gap: "1rem",
    },
    button: {
      padding: "0.5rem 1rem",
      borderRadius: "6px",
      border: `1px solid ${theme?.colors?.divider || "#334155"}`,
      backgroundColor: theme?.colors?.background || "#1e293b",
      color: theme?.colors?.text?.primary || "#f8fafc",
      cursor: "pointer",
      fontSize: "0.9rem",
      fontWeight: "500",
      textDecoration: "none",
    },
    specialAgentBtn: {
      padding: "0.5rem 1rem",
      borderRadius: "6px",
      border: "1px solid rgba(168, 85, 247, 0.4)",
      backgroundColor: "rgba(168, 85, 247, 0.1)",
      color: "#c084fc",
      cursor: "pointer",
      fontSize: "0.9rem",
      fontWeight: "600",
      textDecoration: "none",
    },
  };

  // Safely resolve subscription tier string if it's an object or string
  const subTier = typeof subscription === "string"
    ? subscription.toLowerCase()
    : (subscription?.tier || subscription?.plan_id || "").toLowerCase();

  return (
    <nav style={styles.wrapper}>
      <Link to="/" style={styles.brand}>Nexus Core</Link>
      <div style={styles.actions}>
        {/* Special Agent Directory Link available universally */}
        <Link to="/agents" style={styles.specialAgentBtn}>
          🤖 Special Agent
        </Link>

        {user ? (
          <>
            <Link to="/dashboard" style={styles.button}>Dashboard</Link>

            {subTier === "pro" && (
              <Link to="/executions" style={styles.button}>Executions</Link>
            )}

            {subTier === "enterprise" && (
              <>
                <Link to="/executions" style={styles.button}>Streams</Link>
                <Link to="/executions" style={styles.button}>Audit</Link>
              </>
            )}

            <button style={styles.button} onClick={logout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" style={styles.button}>Login</Link>
            <Link to="/register" style={styles.button}>Register</Link>
            <Link to="/subscription" style={styles.button}>Subscription</Link>
          </>
        )}
        <button style={styles.button} onClick={onToggleTheme}>
          {isDark ? "Light Mode" : "Dark Mode"}
        </button>
      </div>
    </nav>
  );
}