// src/components/CTAButton.jsx
import React from "react";
import { NavLink } from "react-router-dom";

export default function CTAButton({
  to,
  children,
  className = "",
  onClick,
  ...props
}) {
  const baseStyles =
    "inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 cursor-pointer active:scale-95";

  if (to) {
    return (
      <NavLink
        to={to}
        onClick={onClick}
        className={`${baseStyles} ${className}`}
        {...props}
      >
        {children}
      </NavLink>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`${baseStyles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}