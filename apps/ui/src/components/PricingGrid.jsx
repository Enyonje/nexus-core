import React, { useState } from "react";
import { Check, Sparkles, Loader2 } from "lucide-react";
import { PRODUCTS } from "../config/products.js";

export function PricingGrid() {
    const [billingCycle, setBillingCycle] = useState("annual"); // 'monthly' | 'annual'
    const [selectedProductId, setSelectedProductId] = useState("pro");
    const [loadingProductId, setLoadingProductId] = useState(null);
    const [error, setError] = useState(null);

    const handleCheckout = async (product) => {
        setLoadingProductId(product.id);
        setError(null);

        const targetPrice = product.prices[billingCycle];

        try {
            const response = await fetch("/api/payments/create-checkout-session", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    priceId: targetPrice.priceId,
                    productId: product.id,
                    billingCycle,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to initiate checkout session");
            }

            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error("No checkout URL returned from server.");
            }
        } catch (err) {
            console.error("Checkout error:", err);
            setError(err.message);
        } finally {
            setLoadingProductId(null);
        }
    };

    return (
        <div className="w-full max-w-7xl mx-auto px-4 py-12">
            {/* Header */}
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                    Choose Your Plan
                </h2>
                <p className="mt-4 text-lg text-slate-400">
                    Scale your autonomous agent swarms with flexible pricing.
                </p>
            </div>

            {/* Billing Cycle Toggle */}
            <div className="flex justify-center items-center mb-12">
                <div className="relative flex items-center p-1 bg-slate-900 border border-slate-800 rounded-full">
                    <button
                        type="button"
                        onClick={() => setBillingCycle("monthly")}
                        className={`relative z-10 px-5 py-2 text-sm font-semibold rounded-full transition-colors ${billingCycle === "monthly"
                            ? "text-white bg-indigo-600 shadow-md"
                            : "text-slate-400 hover:text-white"
                            }`}
                    >
                        Monthly
                    </button>
                    <button
                        type="button"
                        onClick={() => setBillingCycle("annual")}
                        className={`relative z-10 flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-full transition-colors ${billingCycle === "annual"
                            ? "text-white bg-indigo-600 shadow-md"
                            : "text-slate-400 hover:text-white"
                            }`}
                    >
                        Annual
                        <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">
                            Save 20%
                        </span>
                    </button>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-8 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-center">
                    {error}
                </div>
            )}

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {PRODUCTS.map((product) => {
                    const isSelected = selectedProductId === product.id;
                    const isLoading = loadingProductId === product.id;
                    const currentPrice = product.prices[billingCycle];

                    return (
                        <div
                            key={product.id}
                            onClick={() => setSelectedProductId(product.id)}
                            className={`relative flex flex-col justify-between rounded-2xl p-8 transition-all cursor-pointer border ${isSelected
                                ? "bg-slate-900/90 border-indigo-500 shadow-lg shadow-indigo-500/10 scale-105"
                                : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                                }`}
                        >
                            {product.popular && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-3 py-1 text-xs font-semibold text-white shadow-md">
                                    <Sparkles className="w-3 h-3" />
                                    Most Popular
                                </div>
                            )}

                            <div>
                                <h3 className="text-xl font-bold text-white">{product.name}</h3>
                                <p className="mt-2 text-sm text-slate-400">{product.description}</p>

                                <div className="mt-6 flex items-baseline text-white">
                                    <span className="text-4xl font-extrabold">
                                        {currentPrice.display}
                                    </span>
                                    <span className="ml-1 text-sm font-medium text-slate-400">
                                        /month
                                    </span>
                                    {billingCycle === "annual" && (
                                        <span className="ml-2 text-xs text-slate-500">
                                            (billed annually)
                                        </span>
                                    )}
                                </div>

                                <ul className="mt-6 space-y-3">
                                    {product.features.map((feature, idx) => (
                                        <li key={idx} className="flex items-start gap-3 text-sm text-slate-300">
                                            <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="mt-8">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleCheckout(product);
                                    }}
                                    disabled={Boolean(loadingProductId)}
                                    className={`w-full py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${product.popular
                                        ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20"
                                        : "bg-slate-800 hover:bg-slate-700 text-white"
                                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Redirecting...
                                        </>
                                    ) : (
                                        `Subscribe (${billingCycle})`
                                    )}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}