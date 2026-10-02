import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import SupportOpsRoutes from "./routes/SupportOpsRoutes";
import { AuthProvider } from "./context/AuthContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <SupportOpsRoutes />
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);
