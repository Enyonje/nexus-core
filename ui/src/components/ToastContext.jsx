// src/components/ToastContext.jsx
import React, { createContext, useContext, useState } from "react";

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = "info") => {
    const id = Date.now();
    setToasts([...toasts, { id, message, type }]);
    setTimeout(() => {
      setToasts((t) => t.filter((toast) => toast.id !== id));
    }, 3000); // auto-dismiss after 3s
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div style={styles.container}>
        {toasts.map((toast) => (
          <div key={toast.id} style={styles.toast(toast.type)}>
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

const styles = {
  container: {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    zIndex: 9999,
  },
  toast: (type) => ({
    padding: "12px 16px",
    borderRadius: "6px",
    color: "#fff",
    backgroundColor:
      type === "success"
        ? "#10b981"
        : type === "error"
        ? "#ef4444"
        : "#2563eb",
    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
    fontSize: "0.9rem",
  }),
};