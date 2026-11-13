// src/components/Navbar.jsx — Nexus Core top bar.
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function Navbar({ onToggleTheme, isDark, theme }) {
  // The old bar checked `user`, which was a guest object for signed-out visitors, so everyone
  // saw "Dashboard" and "Logout". isAuthenticated is the real signal.
  const { isAuthenticated, loading, logout } = useAuth();

  const styles = {
    wrapper: {
      display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap",
      padding: "0.75rem 1.5rem",
      backgroundColor: theme?.colors?.surface || "#0f172a",
      borderBottom: `1px solid ${theme?.colors?.divider || "#1e293b"}`,
    },
    brand: { fontWeight: 700, fontSize: "1.25rem", color: theme?.colors?.primary || "#38bdf8", textDecoration: "none" },
    actions: { display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" },
    link: { padding: "0.45rem 0.85rem", borderRadius: 6, color: theme?.colors?.text?.secondary || "#cbd5e1", textDecoration: "none", fontSize: "0.9rem" },
    button: {
      padding: "0.45rem 0.95rem", borderRadius: 6, border: `1px solid ${theme?.colors?.divider || "#334155"}`,
      backgroundColor: theme?.colors?.background || "#1e293b", color: theme?.colors?.text?.primary || "#f8fafc",
      cursor: "pointer", fontSize: "0.9rem", fontWeight: 500, textDecoration: "none",
    },
    primary: { padding: "0.45rem 0.95rem", borderRadius: 6, backgroundColor: "#67e8f9", color: "#020617", fontWeight: 700, fontSize: "0.9rem", textDecoration: "none" },
  };

  return (
    <nav style={styles.wrapper} aria-label="Main">
      <Link to="/" style={styles.brand}>Nexus Core</Link>
      <div style={styles.actions}>
        <NavLink to="/agents" style={styles.link}>Agents</NavLink>
        <NavLink to="/pricing" style={styles.link}>Pricing</NavLink>
        <NavLink to="/docs" style={styles.link}>Docs</NavLink>
        {loading ? null : isAuthenticated ? (
          <>
            <Link to="/dashboard" style={styles.button}>Dashboard</Link>
            <Link to="/billing" style={styles.button}>Billing</Link>
            <button type="button" style={styles.button} onClick={() => logout({ redirectTo: "/" })}>Log out</button>
          </>
        ) : (
          <>
            <Link to="/login" style={styles.button}>Sign in</Link>
            <Link to="/register" style={styles.primary}>Get started</Link>
          </>
        )}
        <button type="button" style={styles.button} onClick={onToggleTheme} aria-label="Toggle colour theme">
          {isDark ? "Light" : "Dark"}
        </button>
      </div>
    </nav>
  );
}
