import React, { useState, useEffect } from 'react';

export default function PricingPage() {
    const [tiers, setTiers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [processingId, setProcessingId] = useState(null);

    // Resolved API base URL - defaults cleanly to Render production
    const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'https://nexus-core-a0px.onrender.com/api/v1').replace(/\/$/, '');

    useEffect(() => {
        let isMounted = true;
        setLoading(true);

        fetch(`${API_BASE}/supportops/pricing`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        })
            .then((res) => {
                if (!res.ok) throw new Error(`Server returned status ${res.status}`);
                return res.json();
            })
            .then((data) => {
                if (!isMounted) return;

                // Correctly extract tiers array from Fastify wrapper payload { success: true, tiers: [...] }
                const pricingTiers = data?.tiers || (Array.isArray(data) ? data : null);

                if (pricingTiers && pricingTiers.length > 0) {
                    setTiers(pricingTiers);
                    setError(null);
                } else {
                    setError('No pricing tiers available.');
                }
            })
            .catch((err) => {
                if (!isMounted) return;
                console.error('[PricingPage] Fetch error:', err);
                setError('Failed to load live pricing. Check connection to API backend.');
            })
            .finally(() => {
                if (isMounted) setLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [API_BASE]);

    const handleAction = async (tier, actionType) => {
        setProcessingId(tier.id);
        try {
            // 1. Instant 14-Day Free Trial (No Credit Card / Stripe required)
            if (actionType === 'trial' || tier.isTrial) {
                const res = await fetch(`${API_BASE}/supportops/start-trial`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ planId: tier.id }),
                });
                const data = await res.json();
                if (data?.redirectUrl) {
                    window.location.href = data.redirectUrl;
                    return;
                }
            }

            // 2. Enterprise Lead Capture / Contact Sales
            if (tier.isEnterprise) {
                window.location.href = '/contact?ref=enterprise_supportops';
                return;
            }

            // 3. Paid Stripe Subscription Checkout
            const res = await fetch(`${API_BASE}/supportops/checkout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    priceId: tier.id,
                    withTrial: actionType === 'trial'
                }),
            });
            const data = await res.json();
            if (data?.url) {
                window.location.href = data.url;
            } else {
                alert(data?.error || 'Unable to initiate checkout session.');
            }
        } catch (err) {
            console.error('[PricingPage] Action Error:', err);
            alert('Network error while processing your request.');
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[400px] flex items-center justify-center text-slate-400">
                Broadcasting live SupportOps pricing...
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-[400px] flex flex-col items-center justify-center text-red-400 space-y-4">
                <p>{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
                >
                    Retry Connection
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-12 space-y-8">
            <div className="text-center space-y-3">
                <h1 className="text-4xl font-bold text-white">SupportOps Plans &amp; Pricing</h1>
                <p className="text-slate-400 max-w-2xl mx-auto">
                    AI-assisted customer support workflows. Compare plans or start a friction-free trial.
                </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 items-stretch">
                {tiers.map((tier) => (
                    <div
                        key={tier.id}
                        className={`bg-slate-900 border rounded-2xl p-8 flex flex-col justify-between space-y-6 ${tier.hasTrial ? 'border-cyan-500/50 shadow-lg shadow-cyan-500/10' : 'border-slate-800'
                            }`}
                    >
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-2xl font-bold text-white">{tier.name}</h3>
                                <div className="mt-4 flex items-baseline text-white">
                                    <span className="text-4xl font-extrabold tracking-tight">{tier.price}</span>
                                    {tier.interval && tier.interval !== 'custom' && (
                                        <span className="ml-1 text-slate-400 text-sm">/{tier.interval}</span>
                                    )}
                                </div>
                            </div>

                            {tier.features && (
                                <ul className="space-y-3 text-sm text-slate-300">
                                    {tier.features.map((feature, idx) => (
                                        <li key={idx} className="flex items-start">
                                            <span className="text-cyan-400 mr-2">✓</span>
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="space-y-3 pt-6 border-t border-slate-800/80">
                            {tier.hasTrial && (
                                <button
                                    onClick={() => handleAction(tier, 'trial')}
                                    disabled={processingId === tier.id}
                                    className="w-full bg-slate-800 hover:bg-slate-700 text-cyan-400 font-semibold py-3 px-4 rounded-xl border border-cyan-500/30 transition-colors"
                                >
                                    {processingId === tier.id ? 'Initializing...' : tier.ctaTrial || 'Start 14-day trial'}
                                </button>
                            )}

                            <button
                                onClick={() => handleAction(tier, 'subscribe')}
                                disabled={processingId === tier.id}
                                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
                            >
                                {processingId === tier.id ? 'Processing...' : tier.cta || tier.ctaSubscribe || 'Subscribe & Setup Workspace'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}