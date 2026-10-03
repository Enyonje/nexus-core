// Button.jsx
export default function Button({ children, variant="primary", className="", ...props }) {
  const base = "inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition";
  const variants = {
    primary: "bg-accent text-white hover:bg-blue-500",
    ghost: "bg-transparent border border-border hover:bg-panel",
  };
  return <button className={`${base} ${variants[variant]} ${className}`} {...props}>{children}</button>;
}

