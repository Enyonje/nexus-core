import { createContext, useContext, useState } from "react";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null); // null until fetched
  const [loading, setLoading] = useState(false);          // global loading state
  const navigate = useNavigate();

  const login = (userData, tier = "free") => {
    setUser(userData);
    setSubscription(tier);

    if (tier === "free") {
      navigate("/dashboard", { replace: true });
    } else if (tier === "pro") {
      navigate("/executions", { replace: true });
    } else if (tier === "enterprise") {
      navigate("/streams", { replace: true });
    }
  };

  const logout = () => {
    setUser(null);
    setSubscription("free");
    navigate("/", { replace: true });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        subscription,
        setSubscription,
        loading,
        setLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}