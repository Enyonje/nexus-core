// src/components/ToastContext.jsx
import React, { createContext, useContext, useState, useCallback } from "react";

export const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((message, type = "info", duration = 4000) => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast, toasts }}>
      {children}
      <div style={styles.container} className="pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={styles.toast(toast.type)}
            className="pointer-events-auto flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            <span className="text-xs font-medium leading-snug">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-white/60 hover:text-white transition-colors p-0.5 rounded focus:outline-none"
              aria-label="Close toast"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

export const useToastContext = useToast;
export default ToastProvider;

const styles = {
  container: {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    zIndex: 99999,
    maxWidth: "400px",
  },
  toast: (type) => ({
    padding: "12px 16px",
    borderRadius: "12px",
    color: "#ffffff",
    backgroundColor:
      type === "success"
        ? "rgba(16, 185, 129, 0.95)"
        : type === "error"
          ? "rgba(239, 68, 68, 0.95)"
          : type === "warning"
            ? "rgba(245, 158, 11, 0.95)"
            : "rgba(30, 41, 59, 0.95)",
    backdropFilter: "blur(12px)",
    border:
      type === "success"
        ? "1px solid rgba(52, 211, 153, 0.3)"
        : type === "error"
          ? "1px solid rgba(248, 113, 113, 0.3)"
          : type === "warning"
            ? "1px solid rgba(251, 191, 36, 0.3)"
            : "1px solid rgba(51, 65, 85, 0.5)",
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
    fontFamily: "system-ui, -apple-system, sans-serif",
  }),
};