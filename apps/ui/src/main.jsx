import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AccessProvider } from "./context/AccessProvider.jsx";

import App from "./app.jsx";
import { ToastProvider } from "./components/ToastContext.jsx";
import AuthProvider from "./context/AuthProvider.jsx";
import "../index.css";

// Nexus Core's sign-in wraps the site. Other products mount their own provider on their own routes (see app.jsx).
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AccessProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </AccessProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

// The pre-rendered search-engine summary is only for crawlers without JavaScript. Once the app
// is running it would leave a second, stale <h1> for screen readers, so drop it.
document.getElementById("seo-content")?.remove();
