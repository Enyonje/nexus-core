// src/pages/PricingPage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Sparkles, Zap, Shield, ArrowRight } from "lucide-react";
import { ROUTES } from "../config/paths";

const PLANS = [
    {
        key: "starter",
        name: "Starter",
        priceMonthly: 49,
        priceAnnual: 39,
        description: "Ideal for small teams scaling customer support automation.",
        features: [
            "Up to 1,000 resolved tickets/mo",
            "2 AI Support Agents",
            "Standard Knowledge Base Sync",
            "Email & Chat Support",
        ],
        highlighted: false,
        cta: "Get Started",
    },
    {
        key: "pro",
        name: "Pro Ops",
        priceMonthly: 149,
        priceAnnual: 119,
        description: "Built for growing support teams with complex workflow orchestration.",
        features: [
            "Up to 10,000 resolved tickets/mo",
            "10 Special AI Agents",
            "Real-time CRM & Webhook Sync",
            "Priority SLA & Fast Execution",
            "Advanced CSAT Analytics",
        ],
        highlighted: true,
        cta: "Start 14-Day Free Trial",
    },
    {
        key: "enterprise",
        name: "Enterprise",
        priceMonthly: 499,
        priceAnnual: 399,
        description: "Custom models, dedicated agents, and strict compliance controls.",
        features: [
            "Unlimited resolved tickets",
            "Custom Fine-tuned Agents",
            "SOC2, HIPAA & ISO Compliance",
            "Dedicated Technical Account Manager",
            "Custom API Integration & Webhooks",
        ],
        highlighted: false,
        cta: "Contact Enterprise",
    },
];

export default function PricingPage() {
    const navigate = useNavigate();
    const [annual, setAnnual] = useState(true);

    const handleSelectPlan = (planKey) => {
        // Navigates to Login/Auth page passing the selected plan
        const authRoute = ROUTES.login || "/login";
        navigate(`${authRoute}?plan=${planKey}`);
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between py-12 px-6 font-sans">
            <div className="max-w-7xl mx-auto w-full">
                {/* Header */}
                <div className="text-center max-w-3xl mx-auto mb-12">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-4">
                        <Sparkles className="w-3.5 h-3.5" /> Flexible Pricing Plans
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
                        Simple pricing for autonomous support.
                    </h1>
                    <p className="text-lg text-slate-400">
                        Choose the plan that fits your growth. Upgrade, downgrade, or cancel anytime.
                    </p>

                    {/* Monthly / Annual Toggle */}
                    <div className="mt-8 flex items-center justify-center gap-3">
                        <span className={`text-sm ${!annual ? "text-white font-semibold" : "text-slate-400"}`}>Monthly</span>
                        <button
                            onClick={() => setAnnual(!annual)}
                            className="relative w-14 h-8 bg-slate-800 rounded-full p-1 border border-slate-700 transition-colors"
                        >
                            <div
                                className={`w-6 h-6 bg-indigo-500 rounded-full transition-transform ${annual ? "translate-x-6" : "translate-x-0"
                                    }`}
                            />
                        </button>
                        <span className={`text-sm ${annual ? "text-white font-semibold" : "text-slate-400"}`}>
                            Annual <span className="text-indigo-400 font-bold">(Save 20%)</span>
                        </span>
                    </div>
                </div>

                {/* Pricing Cards Grid */}
                <div className="grid md:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto">
                    {PLANS.map((plan) => {
                        const price = annual ? plan.priceAnnual : plan.priceMonthly;
                        return (
                            <div
                                key={plan.key}
                                className={`relative flex flex-col justify-between rounded-3xl p-8 backdrop-blur-xl transition-all duration-200 ${plan.highlighted
                                    ? "bg-slate-900 border-2 border-indigo-500 shadow-2xl shadow-indigo-500/20 scale-105 z-10"
                                    : "bg-slate-900/60 border border-slate-800 hover:border-slate-700"
                                    }`}
                            >
                                {plan.highlighted && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-indigo-600 text-white text-xs font-bold uppercase rounded-full tracking-wider shadow-lg">
                                        Most Popular
                                    </div>
                                )}

                                <div>
                                    <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                                    <p className="text-sm text-slate-400 mb-6">{plan.description}</p>

                                    <div className="flex items-baseline gap-1 mb-6">
                                        <span className="text-4xl font-extrabold text-white">${price}</span>
                                        <span className="text-slate-400 text-sm">/month</span>
                                    </div>

                                    <ul className="space-y-3 mb-8">
                                        {plan.features.map((feature, i) => (
                                            <li key={i} className="flex items-center gap-3 text-sm text-slate-300">
                                                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                                                <span>{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <button
                                    onClick={() => handleSelectPlan(plan.key)}
                                    className={`w-full py-3.5 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${plan.highlighted
                                        ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30"
                                        : "bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700"
                                        }`}
                                >
                                    <span>{plan.cta}</span>
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}