import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";

export default function Navbar({ onToggleTheme, isDark, theme }) {
  const { user, subscription, logout } = useAuth();

  const styles = {
    wrapper: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "0.75rem 1.5rem",
      backgroundColor: theme.colors.surface,
      borderBottom: `1px solid ${theme.colors.divider}`,
    },
    brand: {
      fontWeight: "700",
      fontSize: "1.25rem",
      color: theme.colors.primary,
    },
    actions: {
      display: "flex",
      alignItems: "center",
      gap: "1rem",
    },
    button: {
      padding: "0.5rem 1rem",
      borderRadius: "6px",
      border: `1px solid ${theme.colors.divider}`,
      backgroundColor: theme.colors.background,
      color: theme.colors.text.primary,
      cursor: "pointer",
      fontSize: "0.9rem",
      fontWeight: "500",
      textDecoration: "none",
    },
  };

  return (
    <nav style={styles.wrapper}>
      <div style={styles.brand}>Nexus Core</div>
      <div style={styles.actions}>
        {user ? (
          <>
            {/* Always available when logged in */}
            <Link to="/dashboard" style={styles.button}>Dashboard</Link>

            {/* Pro tier */}
            {subscription === "pro" && (
              <Link to="/executions" style={styles.button}>Executions</Link>
            )}

            {/* Enterprise tier */}
            {subscription === "enterprise" && (
              <>
                <Link to="/streams" style={styles.button}>Streams</Link>
                <Link to="/audit" style={styles.button}>Audit</Link>
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