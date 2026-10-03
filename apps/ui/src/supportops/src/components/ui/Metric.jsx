// Metric.jsx
export function Metric({ label, value, tone="default" }) {
  const toneMap = { default: "text-white", success: "text-success", warn: "text-warn", danger: "text-danger" };
  return (
    <div className="card p-4">
      <p className="subtle">{label}</p>
      <p className={`text-3xl font-bold ${toneMap[tone]}`}>{value}</p>
    </div>
  );
}

