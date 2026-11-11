import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'https://nexus-core-a0px.onrender.com/api/v1').replace(/\/$/, '');

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('supportops_token'));
  const [loading, setLoading] = useState(true);

  // Validate session token on mount or when token changes
  useEffect(() => {
    const verifySession = async () => {
      const storedToken = localStorage.getItem('supportops_token');
      if (!storedToken) {
        setUser(null);
        setWorkspace(null);
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
          setWorkspace(data.workspace || null);
        } else {
          // Token expired or invalid
          localStorage.removeItem('supportops_token');
          setToken(null);
          setUser(null);
          setWorkspace(null);
        }
      } catch (err) {
        console.error('[SupportOps Auth Verification Error]:', err);
      } finally {
        setLoading(false);
      }
    };

    verifySession();
  }, [token]);

  // Login handler
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
      setWorkspace(data.workspace || null);

      const redirectPath = data.redirectUrl || '/supportops/admin';
      window.location.assign(redirectPath);
      return data;
    } catch (err) {
      console.error('[SupportOps Login Error]:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Logout handler
  const logout = () => {
    localStorage.removeItem('supportops_token');
    setToken(null);
    setUser(null);
    setWorkspace(null);
    window.location.assign('/supportops/login');
  };

  const value = {
    user,
    workspace,
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