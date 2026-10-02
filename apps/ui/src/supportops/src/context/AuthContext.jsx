import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "supportops_user";
const STAFF_ACCESS_CODE = "SUPPORTOPS-STAFF-2026"; // ✅ secure code for admin/management

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
  const { password, ...safe } = userData;
  return safe;
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
   * register({ name, email, password, role, accessCode }) -> user
   */
  const register = useCallback(
    async (data) => {
      if (!data?.email || !data?.password) {
        throw new Error("Email and password are required");
      }

      // ✅ enforce role restrictions
      let role = data.role || "agent";

      if (role === "admin" || role === "management") {
        if (data.accessCode !== STAFF_ACCESS_CODE) {
          throw new Error("Valid staff access code required for Admin/Management signup");
        }
      }

      return persist({
        id: crypto.randomUUID?.() ?? String(Date.now()),
        name: data.name,
        email: data.email,
        role,
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
      signup: register, // alias for older code
      logout,
      setUser,
    }),
    [user, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
