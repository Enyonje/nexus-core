import { createContext, useContext, useState } from "react";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState("free"); 
  // "free" | "pro" | "enterprise"
  const navigate = useNavigate();

  const login = (userData, tier = "free") => {
    setUser(userData);
    setSubscription(tier);

    // Redirect based on subscription
    if (tier === "free") {
      navigate("/dashboard", { replace: true });
    } else if (tier === "pro") {
      navigate("/executions", { replace: true });
    } else if (tier === "enterprise") {
      navigate("/streams", { replace: true }); // or /audit depending on your design
    }
  };

  const logout = () => {
    setUser(null);
    setSubscription("free");
    navigate("/", { replace: true }); // back to landing page
  };

  return (
    <AuthContext.Provider value={{ user, subscription, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}