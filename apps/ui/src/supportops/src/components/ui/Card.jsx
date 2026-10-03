// Card.jsx
export default function Card({ title, hint, children, className="" }) {
  return (
    <div className={`card p-4 ${className}`}>
      {title && <div className="flex items-baseline justify-between mb-2">
        <h3 className="section-title">{title}</h3>
        {hint && <span className="subtle">{hint}</span>}
      </div>}
      {children}
    </div>
  );
}
