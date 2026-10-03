import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { API_ENDPOINTS } from "../config/paths";


export const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  // On load: use the saved token, or the refresh cookie, then read the user (and role) from the server
  useEffect(() => {
    localStorage.removeItem("supportops_user");
    localStorage.removeItem("supportops_users");

    const controller = new AbortController();

    async function restore() {
      try {
        if (!getToken()) await refreshAccessToken(); // fails quietly when there is no session
        const { user: me } = await apiFetch(API_ENDPOINTS.auth.me, { signal: controller.signal });
        setUser(me);
      } catch (err) {
        if (err.name === "AbortError") return;
        clearToken();
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    restore();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    window.addEventListener(UNAUTHORIZED_EVENT, logout);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, logout);
  }, [logout]);

  // Save the token, then load the canonical user (role included) from /me
  const startSession = useCallback(async ({ token, user: fallbackUser }) => {
    setToken(token);
    let me = fallbackUser;
    try {
      ({ user: me } = await apiFetch(API_ENDPOINTS.auth.me));
    } catch {
      /* fall back to the user returned by login/register */
    }
    setUser(me);
    return me;
  }, []);

  /** register({ name, email, password, role, accessCode }) -> user. The server decides the final role. */
  const register = useCallback(
    async ({ name, email, password, role, accessCode }) => {
      const res = await apiFetch(API_ENDPOINTS.auth.register, {
        method: "POST",
        auth: false,
        body: { name, email, password, role, accessCode: accessCode || undefined },
      });
      return startSession(res);
    },
    [startSession]
  );

  /** login({ email, password }) -> user (with the role stored in the database) */
  const login = useCallback(
    async ({ email, password }) => {
      const res = await apiFetch(API_ENDPOINTS.auth.login, {
        method: "POST",
        auth: false,
        body: { email, password },
      });
      return startSession(res);
    },
    [startSession]
  );

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuth: !!user,
      login,
      register,
      signup: register,
      logout,
    }),
    [user, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
