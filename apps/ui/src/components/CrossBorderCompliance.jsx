"use client";

import React, { useState } from "react";

export function CrossBorderCompliance({ tenantId = "tenant_demo_123" }) {
    const [description, setDescription] = useState("");
    const [declaredValue, setDeclaredValue] = useState("1250.00");
    const [originCountry, setOriginCountry] = useState("US");
    const [destinationCountry, setDestinationCountry] = useState("DE");
    const [loading, setLoading] = useState(false);
    const [dossier, setDossier] = useState(null);
    const [error, setError] = useState(null);

    const handleScreenCommodity = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setDossier(null);

        const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

        try {
            const response = await fetch(`${apiBaseUrl}/api/v1/compliance/screen`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Tenant-ID": tenantId,
                },
                body: JSON.stringify({
                    tenant_id: tenantId,
                    declaration_id: `DEC-${Math.floor(100000 + Math.random() * 900000)}`,
                    items: [
                        {
                            description,
                            declared_value_usd: parseFloat(declaredValue) || 0,
                            origin_country: originCountry,
                            destination_country: destinationCountry,
                        },
                    ],
                }),
            });

            if (!response.ok) {
                throw new Error(`Screening failed with status: ${response.status}`);
            }

            const data = await response.json();
            setDossier(data);
        } catch (err) {
            setError(err.message || "An error occurred during compliance evaluation.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 max-w-4xl mx-auto shadow-xl font-sans">
            {/* Component Header */}
            <div className="border-b border-slate-800 pb-4 mb-6 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-indigo-400">
                        Cross-Border Compliance & Tariff Screening
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                        Automated HS Code Classification, Statutory Sanctions Check, and Tax Duty Estimation.
                    </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-mono bg-indigo-950 text-indigo-300 border border-indigo-800">
                    Nexus Swarm Agent
                </span>
            </div>

            {/* Input Form */}
            <form onSubmit={handleScreenCommodity} className="space-y-4 mb-8">
                <div>
                    <label className="block text-xs font-mono text-slate-300 mb-1">
                        COMMODITY DESCRIPTION
                    </label>
                    <input
                        type="text"
                        required
                        placeholder="e.g., High-frequency wireless network router with encryption module"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-mono text-slate-300 mb-1">
                            DECLARED VALUE (USD)
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            required
                            value={declaredValue}
                            onChange={(e) => setDeclaredValue(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded p-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-mono text-slate-300 mb-1">
                            ORIGIN COUNTRY (ISO)
                        </label>
                        <input
                            type="text"
                            maxLength={2}
                            required
                            value={originCountry}
                            onChange={(e) => setOriginCountry(e.target.value.toUpperCase())}
                            className="w-full bg-slate-950 border border-slate-700 rounded p-2.5 text-sm text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-mono text-slate-300 mb-1">
                            DESTINATION COUNTRY (ISO)
                        </label>
                        <input
                            type="text"
                            maxLength={2}
                            required
                            value={destinationCountry}
                            onChange={(e) => setDestinationCountry(e.target.value.toUpperCase())}
                            className="w-full bg-slate-950 border border-slate-700 rounded p-2.5 text-sm text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full md:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-semibold rounded text-sm transition-colors flex items-center justify-center space-x-2"
                >
                    {loading ? (
                        <span className="animate-pulse">Evaluating Compliance Graph...</span>
                    ) : (
                        <span>Run Compliance Audit</span>
                    )}
                </button>
            </form>

            {/* Error Message */}
            {error && (
                <div className="p-4 mb-6 bg-red-950/80 border border-red-800 text-red-200 rounded text-sm font-mono">
                    ERROR: {error}
                </div>
            )}

            {/* Audit Dossier Display */}
            {dossier && (
                <div className="border border-slate-800 rounded-lg bg-slate-950 p-5 space-y-4 font-mono text-xs">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                        <div>
                            <span className="text-slate-400">DECLARATION ID:</span>{" "}
                            <span className="text-slate-200 font-bold">{dossier.declaration_id}</span>
                        </div>
                        <div className="flex items-center space-x-3">
                            <span className="text-slate-400">LATENCY:</span>{" "}
                            <span className="text-slate-200">{dossier.execution_time_ms}</span>
                            <span
                                className={`px-2.5 py-0.5 rounded text-xs font-bold ${dossier.overall_status === "PASSED"
                                    ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                                    : "bg-red-950 text-red-400 border border-red-800"
                                    }`}
                            >
                                {dossier.overall_status}
                            </span>
                        </div>
                    </div>

                    {/* Dossier Item Cards */}
                    <div className="space-y-3">
                        {dossier.audit_dossier?.map((item, idx) => (
                            <div
                                key={idx}
                                className="p-4 border border-slate-800 rounded bg-slate-900/50 space-y-2"
                            >
                                <div className="flex justify-between">
                                    <span className="text-slate-300 font-semibold">{item.item_description}</span>
                                    <span className="text-indigo-400 font-bold">HS: {item.inferred_hs_code}</span>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] pt-2 border-t border-slate-800/60">
                                    <div>
                                        <span className="text-slate-500">SANCTIONS CLEAR:</span>
                                        <p
                                            className={
                                                item.sanctions_cleared ? "text-emerald-400 font-bold" : "text-red-400 font-bold"
                                            }
                                        >
                                            {item.sanctions_cleared ? "PASSED" : "FLAGGED"}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">TARIFF RATE:</span>
                                        <p className="text-slate-200">{item.applicable_duty_rate}</p>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">EST. TAX (USD):</span>
                                        <p className="text-slate-200">${item.estimated_tax_usd}</p>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">ITEM STATUS:</span>
                                        <p className="text-slate-200">{item.status}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-2 text-right">
                        <button
                            onClick={() => alert(JSON.stringify(dossier, null, 2))}
                            className="text-xs text-indigo-400 hover:text-indigo-300 underline"
                        >
                            Export Full Forensic JSON Dossier
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}