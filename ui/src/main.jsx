import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./app.jsx";
import { ToastProvider } from "./components/ToastContext.jsx";
import { AuthProvider } from "./context/AuthProvider.jsx";
import "../index.css"; // Ensure Tailwind is active

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);