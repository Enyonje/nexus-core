import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import SupportOpsRoutes from "./routes/SupportOpsRoutes";
import { AuthProvider } from "./context/AuthContext";
import { AccessProvider } from "./context/AccessProvider";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <AccessProvider>
        <BrowserRouter>
          <SupportOpsRoutes />
        </BrowserRouter>
      </AccessProvider>
    </AuthProvider>
  </React.StrictMode>
);
