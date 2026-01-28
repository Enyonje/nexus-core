import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";

export default function Layout({ children, theme }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { user, subscription, loading } = useAuth();

  const styles = {
    wrapper: {
      minHeight: "100vh",
      backgroundColor: theme.colors.background,
      fontFamily: theme.typography.fontFamily,
      display: "flex",
    },
    sidebar: {
      width: "220px",
      backgroundColor: theme.colors.surface,
      borderRight: `1px solid ${theme.colors.divider}`,
      padding: "1rem",
    },
    navItem: (active) => ({
      display: "block",
      padding: "0.6rem 0.75rem",
      marginBottom: "0.5rem",
      borderRadius: "6px",
      textDecoration: "none",
      color: active
        ? theme.colors.primary
        : theme.colors.text.primary,
      backgroundColor: active
        ? theme.colors.primaryLight
        : "transparent",
      fontWeight: active ? 600 : 400,
    }),
    content: {
      flex: 1,
      padding: "1.5rem",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottom: `1px solid ${theme.colors.divider}`,
      paddingBottom: "0.75rem",
      marginBottom: "1rem",
      fontSize: "1.25rem",
      fontWeight: 600,
    },
  };

  if (loading) {
    return (
      <div style={{ padding: "2rem", color: theme.colors.text.secondary }}>
        Loading session…
      </div>
    );
  }

  return (
    <div style={styles.wrapper}>
      {/* SIDEBAR */}
      <aside style={styles.sidebar}>
        <h2 style={{ marginBottom: "1rem", fontWeight: 700 }}>
          Nexus Core
        </h2>

        <Link
          to="/"
          style={styles.navItem(location.pathname === "/")}
        >
          Dashboard
        </Link>

        <Link
          to="/goals"
          style={styles.navItem(location.pathname.startsWith("/goals"))}
        >
          Goals
        </Link>

        {/* PRO */}
        {subscription === "pro" || subscription === "enterprise" ? (
          <Link
            to="/executions"
            style={styles.navItem(
              location.pathname.startsWith("/executions")
            )}
          >
            Executions
          </Link>
        ) : null}

        {/* ENTERPRISE */}
        {subscription === "enterprise" && (
          <>
            <Link
              to="/streams"
              style={styles.navItem(
                location.pathname.startsWith("/streams")
              )}
            >
              Streams
            </Link>
            <Link
              to="/audit"
              style={styles.navItem(
                location.pathname.startsWith("/audit")
              )}
            >
              Audit Logs
            </Link>
          </>
        )}

        <Link
          to="/subscription"
          style={styles.navItem(
            location.pathname.startsWith("/subscription")
          )}
        >
          Subscription
        </Link>
      </aside>

      {/* MAIN */}
      <main style={styles.content}>
        <div style={styles.header}>
          <span>
            {location.pathname === "/"
              ? "Dashboard"
              : location.pathname.replace("/", "").toUpperCase()}
          </span>

          {user && (
            <span style={{ fontSize: "0.85rem", opacity: 0.7 }}>
              {subscription?.toUpperCase() || "FREE"}
            </span>
          )}
        </div>

        {children}
      </main>
    </div>
  );
}
