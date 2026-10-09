// src/components/LoadingSpinner.jsx
import React from "react";

const SIZE_MAP = {
  xs: 16,
  sm: 24,
  md: 32,
  lg: 48,
  xl: 64,
};

export function LoadingSpinner({
  size = "md",
  color = "#3b82f6", // Indigo/Blue default
  label,
  fullScreen = false,
  className = "",
}) {
  // Resolve size numeric value whether passed as string alias ("md") or number (40)
  const numericSize = typeof size === "number" ? size : SIZE_MAP[size] || 32;
  const strokeWidth = Math.max(2, Math.round(numericSize / 8));

  const spinnerContent = (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div
        style={{
          width: `${numericSize}px`,
          height: `${numericSize}px`,
          borderWidth: `${strokeWidth}px`,
          borderStyle: "solid",
          borderColor: "rgba(255, 255, 255, 0.1)",
          borderTopColor: color,
          borderRadius: "50%",
        }}
        className="animate-spin shrink-0"
        role="status"
        aria-label="Loading"
      />
      {label && (
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 animate-pulse">
          {label}
        </span>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020617]/80 backdrop-blur-md">
        {spinnerContent}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center w-full h-full min-h-[60px]">
      {spinnerContent}
    </div>
  );
}

export default LoadingSpinner;