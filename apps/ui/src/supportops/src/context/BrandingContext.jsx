import { createContext, useContext, useEffect, useState } from "react";
import api from "../lib/api";

const BrandingContext = createContext(null);

export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState(null);

  useEffect(() => {
    api.get("/branding/me").then(res => {
      setBranding(res.data);

      document.documentElement.style.setProperty(
        "--primary-color",
        res.data.primary_color
      );
      document.documentElement.style.setProperty(
        "--accent-color",
        res.data.accent_color
      );

      if (res.data.app_name) {
        document.title = res.data.app_name;
      }
    });
  }, []);

  return (
    <BrandingContext.Provider value={branding}>
      {children}
    </BrandingContext.Provider>
  );
}

export const useBranding = () => useContext(BrandingContext);
