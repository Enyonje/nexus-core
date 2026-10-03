// frontend/src/contexts/TenantContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../lib/api";

const TenantContext = createContext(null);

export function TenantProvider({ children }) {
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTenant() {
      try {
        const res = await api.get("/tenants/branding");
        setTenant(res.data);

        // persist tenant id for interceptors
        if (res.data?.id) {
          localStorage.setItem("tenant_id", res.data.id);
        }
      } catch (err) {
        console.error("Tenant load failed", err);
      } finally {
        setLoading(false);
      }
    }

    loadTenant();
  }, []);

  return (
    <TenantContext.Provider value={{ tenant, loading }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  return useContext(TenantContext);
}
