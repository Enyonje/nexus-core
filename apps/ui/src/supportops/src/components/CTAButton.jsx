// src/components/CTAButton.jsx
import { NavLink } from "react-router-dom";

export default function CTAButton({
  children,
  to,
  onClick,
  type = "button",
  className = "",
}) {
  if (to) {
    return (
      <NavLink
        to={to}
        className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl
                    bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-300
                    text-white font-semibold shadow-sm transition active:scale-[0.98] ${className}`}
      >
        {children}
      </NavLink>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl
                  bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-300
                  text-white font-semibold shadow-sm transition active:scale-[0.98] ${className}`}
    >
      {children}
    </button>
  );
}
