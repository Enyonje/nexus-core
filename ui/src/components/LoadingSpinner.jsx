// src/components/LoadingSpinner.jsx
import React from "react";

export default function LoadingSpinner({ size = 40, color = "#2563eb" }) {
  const styles = {
    spinner: {
      width: size,
      height: size,
      border: `${size / 8}px solid #e5e7eb`,
      borderTop: `${size / 8}px solid ${color}`,
      borderRadius: "50%",
      animation: "spin 1s linear infinite",
    },
    wrapper: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "100%",
    },
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.spinner}></div>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}