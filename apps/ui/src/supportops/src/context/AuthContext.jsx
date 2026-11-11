import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'https://nexus-core-a0px.onrender.com/api/v1').replace(/\/$/, '');

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('supportops_token'));
  const [loading, setLoading] = useState(true);

  // Synchronize token and fetch current workspace session
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('supportops_token');
      if (!storedToken) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/supportops/me`, {
          headers: {
            'Authorization': `Bearer ${storedToken}`,
            'Content-Type': 'application/json',
          },
        });

        const data = await res.json();
        if (res.ok && data.success) {
          setUser(data.user);
        } else {
          // Token expired or invalid
          localStorage.removeItem('supportops_token');
          setToken(null);
          setUser(null);
        }
      } catch (err) {
        console.error('[SupportOps Auth Sync Error]:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [token]);

  // SupportOps Login Handler
  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/supportops/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Authentication failed.');
      }

      if (data.token) {
        localStorage.setItem('supportops_token', data.token);
        setToken(data.token);
      }

      setUser(data.user || { email, role: 'Super Admin' });

      const targetUrl = data.redirectUrl || '/supportops/admin';
      window.location.assign(targetUrl);
      return data;
    } catch (err) {
      console.error('[SupportOps Login Error]:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // SupportOps Logout Handler
  const logout = () => {
    localStorage.removeItem('supportops_token');
    setToken(null);
    setUser(null);
    window.location.assign('/supportops/login');
  };

  const value = {
    user,
    token,
    isAuthenticated: !!token,
    loading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}