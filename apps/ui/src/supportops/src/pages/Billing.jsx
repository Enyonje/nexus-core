import api from "../lib/api";

export default function Billing() {
  async function subscribe(plan) {
    try {
      const res = await api.post("/billing/create-checkout-session", {
        plan,
      });

      window.location.href = res.data.url;
    } catch (err) {
      console.error(err);
      alert("Unable to start checkout");
    }
  }

  const plans = [
    {
      name: "Starter",
      price: "$29 / month",
      planId: "starter",
      features: [
        "AI Inbox",
        "Auto Ticket Resolution",
        "Basic Analytics",
        "Email Support",
      ],
    },
    {
      name: "Pro",
      price: "$99 / month",
      planId: "pro",
      highlight: true,
      features: [
        "Everything in Starter",
        "Predictive Analytics",
        "Revenue Forecasting",
        "AI Workflows",
        "Priority Support",
      ],
    },
    {
      name: "Enterprise",
      price: "Custom",
      planId: "enterprise",
      features: [
        "Autonomous Brain",
        "Incident Command Center",
        "Role-Based Dashboards",
        "Dedicated SLA",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-white px-6 py-16">
      <h1 className="text-4xl font-bold text-center mb-4">
        Choose Your Plan
      </h1>
      <p className="text-slate-400 text-center mb-12">
        Scale your support with AI-powered automation
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-2xl p-8 border ${
              plan.highlight
                ? "border-blue-500 bg-blue-500/10"
                : "border-white/10 bg-white/5"
            }`}
          >
            <h2 className="text-2xl font-semibold mb-2">
              {plan.name}
            </h2>
            <p className="text-3xl font-bold mb-6">{plan.price}</p>

            <ul className="space-y-3 text-slate-300 mb-6">
              {plan.features.map((f) => (
                <li key={f}>✓ {f}</li>
              ))}
            </ul>

            <button
              onClick={() => subscribe(plan.planId)}
              className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 font-semibold"
            >
              Get Started
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
