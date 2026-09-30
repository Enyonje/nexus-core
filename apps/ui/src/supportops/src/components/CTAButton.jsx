// src/components/CTAButton.jsx
export default function CTAButton({ children, onClick, type = "button" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl
                 bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-300
                 text-white font-semibold shadow-sm transition active:scale-[0.98]"
    >
      {children}
    </button>
  );
}