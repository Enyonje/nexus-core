import { createContext, useContext, useState, useEffect } from "react";

const API_BASE_URL =
  import.meta.env.VITE_BACKEND_API_URL ||
  "https://supportops-ai.onrender.com/api/v1";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [role, setRole] = useState(null);
  const [user, setUser] = useState(null);

  // Load persisted auth
  useEffect(() => {
    const t = localStorage.getItem("access_token");
    const r = localStorage.getItem("role");
    const u = localStorage.getItem("user");

    if (t) setToken(t);
    if (r) setRole(r);
    if (u) setUser(JSON.parse(u));
  }, []);

  // Login
  const login = (payload) => {
    if (!payload) throw new Error("Invalid login payload");

    const accessToken = payload.access_token || payload.token;
    const userRole = payload.role;

    const userObj = {
      email: payload.email ?? "unknown@example.com",
      name: payload.name ?? "User",
      role: userRole,
    };

    localStorage.setItem("access_token", accessToken);
    localStorage.setItem("role", userRole);
    localStorage.setItem("user", JSON.stringify(userObj));

    setToken(accessToken);
    setRole(userRole);
    setUser(userObj);

    return { access_token: accessToken, role: userRole, user: userObj };
  };

  // Signup
  const signup = async ({ email, password, name }) => {
    console.log("API_BASE_URL:", API_BASE_URL);

    const res = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password, name }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Signup failed");
    }

    const data = await res.json();
    return login(data);
  };

  const logout = () => {
    localStorage.clear();
    setToken(null);
    setRole(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        role,
        user,
        login,
        signup,
        logout,
        isAuth: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
};
