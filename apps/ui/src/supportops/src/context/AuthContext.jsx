import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "supportops_user";

export const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Never persist passwords in localStorage
function sanitize(userData = {}) {
  // eslint-disable-next-line no-unused-vars
  const { password, ...safe } = userData;
  return { role: "agent", ...safe };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setUser(JSON.parse(stored));
    } catch (err) {
      console.error("Failed to parse stored user session", err);
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  const persist = useCallback((userData) => {
    const safe = sanitize(userData);
    setUser(safe);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
    return safe;
  }, []);

  const login = useCallback(async (userData) => persist(userData), [persist]);

  /**
   * register({ name, email, password }) -> user
   * Currently local-only. To use a real backend, replace the body with:
   *   const res = await api.post("/auth/register", data);
   *   return persist(res.data.user);
   */
  const register = useCallback(
    async (data) => {
      if (!data?.email || !data?.password) {
        throw new Error("Email and password are required");
      }
      return persist({
        id: crypto.randomUUID?.() ?? String(Date.now()),
        name: data.name,
        email: data.email,
        role: "agent",
      });
    },
    [persist]
  );

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuth: !!user,
      login,
      register,
      signup: register, // alias so older code calling signup() keeps working
      logout,
      setUser,
    }),
    [user, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
