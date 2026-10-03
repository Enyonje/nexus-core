import api from "../lib/api";

export default function SelectPlan() {
  async function checkout(plan) {
    const res = await api.post("/billing/checkout", { plan });
    window.location.href = res.data.url;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
      <div className="grid md:grid-cols-3 gap-6 max-w-6xl w-full p-6">
        {[
          { id: "starter", price: "$39", label: "Starter" },
          { id: "pro", price: "$99", label: "Pro" },
          { id: "enterprise", price: "Custom", label: "Enterprise" },
        ].map((p) => (
          <div
            key={p.id}
            className="border border-white/10 rounded-2xl p-6 bg-white/5"
          >
            <h3 className="text-xl font-bold">{p.label}</h3>
            <p className="text-3xl my-4">{p.price}</p>
            <button
              onClick={() => checkout(p.id)}
              className="w-full mt-6 bg-blue-600 py-3 rounded-xl hover:bg-blue-700"
            >
              Get Started
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
