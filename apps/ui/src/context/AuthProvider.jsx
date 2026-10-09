import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  const getStoredToken = () =>
    localStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("authToken");

  const clearAuthStorage = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("access_token");
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
  };

  const logout = useCallback(() => {
    clearAuthStorage();
    setUser(null);
    setSubscription(null);
  }, []);

  const fetchAuthData = useCallback(async () => {
    const token = getStoredToken();

    if (!token) {
      setUser(null);
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      // Mock or replace with your actual API calls
      const resUser = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (resUser.ok) {
        const userData = await resUser.json();
        setUser(userData);

        const resSub = await fetch("/api/auth/subscription", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (resSub.ok) {
          const subData = await resSub.json();
          setSubscription(subData);
        }
      } else {
        logout();
      }
    } catch (err) {
      console.error("Auth verification error:", err);
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    fetchAuthData();
  }, [fetchAuthData]);

  const login = async (credentials) => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        throw new Error("Login failed");
      }

      const data = await response.json();
      const token = data?.token || data?.access_token;
      if (token) {
        localStorage.setItem("token", token);
      }

      await fetchAuthData();
      return data;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        subscription,
        loading,
        isAuthenticated: !!user,
        login,
        logout,
        refetchAuth: fetchAuthData,
        setUser,
        setSubscription,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Primary Hook Export
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Legacy / Alias Exports
export const useAuthContext = useAuth;

export default AuthProvider;