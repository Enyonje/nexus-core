import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { AuthProvider } from "./context/AuthProvider";
import { JourneyProvider } from "./context/JourneyContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <JourneyProvider>
          <App />
        </JourneyProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
