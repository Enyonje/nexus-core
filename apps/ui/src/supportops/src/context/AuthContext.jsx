import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../lib/api";

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("access_token");
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  async function login(credentials) {
    const { email, password } = credentials;

    // ✅ Hardcoded admin check
    if (email === "support@admin.com" && password === "atimmy22") {
  const adminUser = { email, role: "admin", name: "Support Admin" };
  localStorage.setItem("access_token", "admin-token"); // dummy token
  localStorage.setItem("user", JSON.stringify(adminUser));
  setUser(adminUser);
  return adminUser;

    }

    // Normal user login via backend
    const res = await api.post("/auth/login", credentials);
    const { access_token, ...userData } = res.data;
    localStorage.setItem("access_token", access_token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
    return userData;
  }

  async function register(credentials) {
    const res = await api.post("/auth/register", credentials);
    const { access_token, ...userData } = res.data;
    localStorage.setItem("access_token", access_token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
    return userData;
  }

  function logout() {
    localStorage.clear();
    setUser(null);
    window.location.href = "/login";
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}