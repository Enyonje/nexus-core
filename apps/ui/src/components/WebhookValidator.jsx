import React, { useState, useMemo, useEffect } from "react";
import {
    ShieldCheck,
    ShieldAlert,
    Clock,
    KeyRound,
    FileCode,
    Copy,
    Check,
    RefreshCw,
    Zap,
    Sparkles,
    ArrowRight,
    Code2,
    AlertTriangle,
    FileJson,
    CheckCircle2,
    Lock,
    Search,
    ExternalLink,
    ChevronRight
} from "lucide-react";

// Provider Presets
const PROVIDERS = {
    STRIPE: {
        id: "STRIPE",
        name: "Stripe",
        headerName: "stripe-signature",
        headerExample: "t=1727388000,v1=5257a869e7ecebeda32fad62cd01f2110166299351e223b1610e206b9b323862",
        samplePayload: JSON.stringify(
            {
                id: "evt_3Mv8L2LkdIwHu7ix0rWXYZ99",
                object: "event",
                api_version: "2023-10-16",
                created: Math.floor(Date.now() / 1000),
                type: "payment_intent.succeeded",
                data: {
                    object: {
                        id: "pi_3Mv8L2LkdIwHu7ix0rWXYZ99",
                        object: "payment_intent",
                        amount: 2000,
                        currency: "usd",
                        status: "succeeded"
                    }
                }
            },
            null,
            2
        ),
        requiredFields: ["id", "object", "type", "data"]
    },
    MPESA: {
        id: "MPESA",
        name: "M-Pesa (Daraja)",
        headerName: "x-mpesa-signature",
        headerExample: "dGhpc2lzYW1vY2tzaWduYXR1cmVmb3JtcGVzYWRhcmFqYXZhbGlkYXRpb24=",
        samplePayload: JSON.stringify(
            {
                Body: {
                    stkCallback: {
                        MerchantRequestID: "29115-3462831-1",
                        CheckoutRequestID: "ws_CO_26092026190000001",
                        ResultCode: 0,
                        ResultDesc: "The service request is processed successfully.",
                        CallbackMetadata: {
                            Item: [
                                { Name: "Amount", Value: 1500.00 },
                                { Name: "MpesaReceiptNumber", Value: "QKH1234567" },
                                { Name: "TransactionDate", Value: 20260926190000 },
                                { Name: "PhoneNumber", Value: 254712345678 }
                            ]
                        }
                    }
                }
            },
            null,
            2
        ),
        requiredFields: ["Body", "Body.stkCallback", "Body.stkCallback.ResultCode"]
    },
    GITHUB: {
        id: "GITHUB",
        name: "GitHub",
        headerName: "x-hub-signature-256",
        headerExample: "sha256=757107ea0eb2509fc211221cce984b8a37570b6d7586c22c46f4379681234567",
        samplePayload: JSON.stringify(
            {
                ref: "refs/heads/main",
                repository: {
                    id: 129089607,
                    name: "nexus-core-api",
                    full_name: "nexus/nexus-core-api"
                },
                pusher: { name: "octocat", email: "octocat@github.com" }
            },
            null,
            2
        ),
        requiredFields: ["ref", "repository", "pusher"]
    },
    SHOPIFY: {
        id: "SHOPIFY",
        name: "Shopify",
        headerName: "x-shopify-hmac-sha256",
        headerExample: "23A499719F8704D1164919E3A591F3507B50A196",
        samplePayload: JSON.stringify(
            {
                id: 82098291194615,
                email: "jon@example.com",
                created_at: new Date().toISOString(),
                total_price: "199.99",
                currency: "USD"
            },
            null,
            2
        ),
        requiredFields: ["id", "email", "total_price"]
    }
};

export default function WebhookValidator() {
    const [provider, setProvider] = useState("STRIPE");
    const [payload, setPayload] = useState(PROVIDERS.STRIPE.samplePayload);
    const [secret, setSecret] = useState("whsec_test_secret_key_12345");
    const [signatureHeader, setSignatureHeader] = useState(PROVIDERS.STRIPE.headerExample);
    const [toleranceSeconds, setToleranceSeconds] = useState(300);
    const [calculatedSig, setCalculatedSig] = useState("");
    const [copiedCode, setCopiedCode] = useState(false);
    const [selectedLang, setSelectedLang] = useState("node");

    // Reset preset when changing provider
    const handleProviderChange = (key) => {
        setProvider(key);
        const p = PROVIDERS[key];
        setPayload(p.samplePayload);
        setSignatureHeader(p.headerExample);
    };

    // Web Crypto API HMAC SHA-256 Calculation
    useEffect(() => {
        let isSubscribed = true;

        async function computeHmac() {
            if (!payload || !secret) {
                if (isSubscribed) setCalculatedSig("");
                return;
            }

            try {
                const enc = new TextEncoder();
                const keyData = enc.encode(secret);
                const cryptoKey = await window.crypto.subtle.importKey(
                    "raw",
                    keyData,
                    { name: "HMAC", hash: "SHA-256" },
                    false,
                    ["sign"]
                );

                let dataToSign = payload;
                if (provider === "STRIPE") {
                    // Extract timestamp if present in header
                    const match = signatureHeader.match(/t=(\d+)/);
                    const t = match ? match[1] : Math.floor(Date.now() / 1000).toString();
                    dataToSign = `${t}.${payload}`;
                }

                const signatureBuffer = await window.crypto.subtle.sign(
                    "HMAC",
                    cryptoKey,
                    enc.encode(dataToSign)
                );

                const hashArray = Array.from(new Uint8Array(signatureBuffer));
                const hexHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

                if (isSubscribed) {
                    setCalculatedSig(hexHash);
                }
            } catch (err) {
                if (isSubscribed) setCalculatedSig("Error calculating signature");
            }
        }

        computeHmac();
        return () => {
            isSubscribed = false;
        };
    }, [payload, secret, signatureHeader, provider]);

    // Validation Logic Engine
    const validation = useMemo(() => {
        const activeProvider = PROVIDERS[provider];
        let isJsonValid = false;
        let parsedJson = null;
        let schemaErrors = [];
        let piiWarnings = [];
        let timestampValid = true;
        let timestampDiff = 0;

        // 1. Check JSON Validity
        try {
            parsedJson = JSON.parse(payload);
            isJsonValid = true;
        } catch (e) {
            return {
                isJsonValid: false,
                jsonError: e.message,
                schemaErrors: ["Invalid JSON payload."],
                piiWarnings: [],
                timestampValid: false,
                signatureMatch: false,
                status: "CRITICAL"
            };
        }

        // 2. Validate Schema Fields
        activeProvider.requiredFields.forEach((field) => {
            const keys = field.split(".");
            let curr = parsedJson;
            let missing = false;

            for (const k of keys) {
                if (curr && typeof curr === "object" && k in curr) {
                    curr = curr[k];
                } else {
                    missing = true;
                    break;
                }
            }

            if (missing) {
                schemaErrors.push(`Missing required field: '${field}'`);
            }
        });

        // 3. Scan for PII & Unmasked Data
        const rawStr = JSON.stringify(parsedJson);
        if (/\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/.test(rawStr)) {
            piiWarnings.push("Potential unmasked Credit Card Number (PAN) detected in payload!");
        }
        if (/\b\d{3}-\d{2}-\d{4}\b/.test(rawStr)) {
            piiWarnings.push("Unencrypted Social Security Number (SSN) pattern found.");
        }

        // 4. Timestamp Freshness Check
        if (provider === "STRIPE") {
            const match = signatureHeader.match(/t=(\d+)/);
            if (match) {
                const headerTs = parseInt(match[1], 10);
                const nowSec = Math.floor(Date.now() / 1000);
                timestampDiff = Math.abs(nowSec - headerTs);
                if (timestampDiff > toleranceSeconds) {
                    timestampValid = false;
                }
            }
        }

        // 5. Signature Matching
        let signatureMatch = false;
        if (calculatedSig && signatureHeader) {
            signatureMatch = signatureHeader.toLowerCase().includes(calculatedSig.toLowerCase());
        }

        const isSuccess = isJsonValid && schemaErrors.length === 0 && timestampValid;

        return {
            isJsonValid,
            parsedJson,
            schemaErrors,
            piiWarnings,
            timestampValid,
            timestampDiff,
            signatureMatch,
            status: isSuccess ? "VALID" : "INVALID"
        };
    }, [payload, signatureHeader, provider, calculatedSig, toleranceSeconds]);

    // Code Snippets Generator
    const getCodeSnippet = () => {
        const currentProv = PROVIDERS[provider];
        if (selectedLang === "node") {
            return `const express = require('express');
const crypto = require('crypto');
const app = express();

app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['${currentProv.headerName}'];
  const secret = process.env.WEBHOOK_SECRET;

  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(req.body).digest('hex');

  if (sig && sig.includes(digest)) {
    console.log('✅ Webhook Signature Verified');
    res.status(200).send('Verified');
  } else {
    console.error('❌ Signature Mismatch');
    res.status(400).send('Invalid Signature');
  }
});`;
        }

        if (selectedLang === "python") {
            return `import hmac
import hashlib
from fastapi import FastAPI, Request, HTTPException

app = FastAPI()

@app.post("/webhook")
async def handle_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("${currentProv.headerName}", "")
    secret = "your_webhook_secret".encode('utf-8')

    computed_hmac = hmac.new(secret, payload, hashlib.sha256).hexdigest()

    if not hmac.compare_digest(computed_hmac, sig_header):
        raise HTTPException(status_code=400, detail="Invalid Signature")

    return {"status": "success"}`;
        }

        return `// TypeScript Webhook Handler
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('${currentProv.headerName}') || '';
  const secret = process.env.WEBHOOK_SECRET || '';

  const hmac = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  if (signature.includes(hmac)) {
    return NextResponse.json({ received: true });
  }

  return NextResponse.json({ error: 'Signature verification failed' }, { status: 400 });
}`;
    };

    const copySnippet = () => {
        navigator.clipboard.writeText(getCodeSnippet());
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
    };

    return (
        <div className="min-h-screen bg-[#070a12] text-slate-100 font-sans pb-16 px-4 md:px-8 pt-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-5 gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <KeyRound className="w-6 h-6 text-cyan-400" />
                        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                            Webhook Signature & Payload Validator
                        </h1>
                    </div>
                    <p className="text-slate-400 text-sm flex items-center gap-2 mt-1">
                        <FileCode className="w-4 h-4 text-slate-500" /> Test HMAC signatures, timestamp freshness, and JSON schemas locally.
                    </p>
                </div>

                {/* Provider Switcher */}
                <div className="flex flex-wrap gap-2">
                    {Object.keys(PROVIDERS).map((key) => (
                        <button
                            key={key}
                            onClick={() => handleProviderChange(key)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${provider === key
                                ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/20"
                                : "bg-slate-800/80 text-slate-400 hover:bg-slate-700 border border-slate-700/60"
                                }`}
                        >
                            {PROVIDERS[key].name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Validation Status Banner */}
            <div
                className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${validation.status === "VALID"
                    ? "bg-emerald-950/30 border-emerald-800/60 text-emerald-300"
                    : "bg-red-950/30 border-red-800/60 text-red-300"
                    }`}
            >
                <div className="flex items-center gap-3">
                    {validation.status === "VALID" ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                    ) : (
                        <AlertTriangle className="w-6 h-6 text-red-400 shrink-0" />
                    )}
                    <div>
                        <h2 className="font-bold text-sm tracking-wide">
                            STATUS: {validation.status === "VALID" ? "PAYLOAD & SIGNATURE VALID" : "VALIDATION ISSUES DETECTED"}
                        </h2>
                        <p className="text-xs opacity-80 mt-0.5">
                            {validation.status === "VALID"
                                ? "Schema structure is accurate and HMAC computation matches specified headers."
                                : "Review the payload fields or HMAC header signature match below."}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800 shrink-0">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Tolerance: {toleranceSeconds}s</span>
                </div>
            </div>

            {/* Editor & Parameters Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Input Form */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Config Controls */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-medium text-slate-400 block mb-1">Webhook Secret Key</label>
                                <input
                                    type="text"
                                    value={secret}
                                    onChange={(e) => setSecret(e.target.value)}
                                    placeholder="whsec_..."
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-medium text-slate-400 block mb-1">
                                    Header ({PROVIDERS[provider].headerName})
                                </label>
                                <input
                                    type="text"
                                    value={signatureHeader}
                                    onChange={(e) => setSignatureHeader(e.target.value)}
                                    placeholder="Signature Header Value..."
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Raw JSON Payload Area */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                                <FileJson className="w-3.5 h-3.5 text-cyan-400" /> Raw Body Payload
                            </label>
                            <button
                                onClick={() => setPayload(PROVIDERS[provider].samplePayload)}
                                className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1"
                            >
                                <RefreshCw className="w-3 h-3" /> Reset Sample Payload
                            </button>
                        </div>
                        <textarea
                            rows={12}
                            value={payload}
                            onChange={(e) => setPayload(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500 resize-y"
                        />
                    </div>
                </div>

                {/* Right Column: Computed Validation Results */}
                <div className="space-y-4">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-4 font-mono text-xs">
                        <h3 className="text-xs font-sans font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-cyan-400" /> Inspection Breakdown
                        </h3>

                        {/* Calculated HMAC Digest */}
                        <div className="space-y-1">
                            <span className="text-slate-500 text-[11px]">Calculated HMAC (SHA-256):</span>
                            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 break-all text-cyan-300">
                                {calculatedSig || "N/A"}
                            </div>
                        </div>

                        {/* Checks list */}
                        <div className="space-y-2 pt-2 border-t border-slate-800">
                            <div className="flex items-center justify-between">
                                <span className="text-slate-400">JSON Format:</span>
                                {validation.isJsonValid ? (
                                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                                        <Check className="w-3 h-3" /> Valid
                                    </span>
                                ) : (
                                    <span className="text-red-400 font-bold">Invalid JSON</span>
                                )}
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-slate-400">Signature Match:</span>
                                {validation.signatureMatch ? (
                                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                                        <Check className="w-3 h-3" /> Matches
                                    </span>
                                ) : (
                                    <span className="text-amber-400 font-bold">Mismatch</span>
                                )}
                            </div>

                            {provider === "STRIPE" && (
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400">Timestamp Drift:</span>
                                    <span className={validation.timestampValid ? "text-emerald-400" : "text-red-400"}>
                                        {validation.timestampDiff}s diff
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Schema Errors List */}
                        {validation.schemaErrors.length > 0 && (
                            <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-lg space-y-1">
                                <span className="text-red-400 font-bold block">Schema Errors:</span>
                                {validation.schemaErrors.map((err, i) => (
                                    <p key={i} className="text-red-300 text-[11px]">
                                        • {err}
                                    </p>
                                ))}
                            </div>
                        )}

                        {/* PII Alerts */}
                        {validation.piiWarnings.length > 0 && (
                            <div className="p-3 bg-amber-950/40 border border-amber-900/50 rounded-lg space-y-1">
                                <span className="text-amber-400 font-bold block flex items-center gap-1">
                                    <Lock className="w-3.5 h-3.5" /> PII Warning:
                                </span>
                                {validation.piiWarnings.map((warn, i) => (
                                    <p key={i} className="text-amber-300 text-[11px]">
                                        • {warn}
                                    </p>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Backend Code Snippet Generator */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                                <Code2 className="w-4 h-4 text-cyan-400" /> Verification Code
                            </span>
                            <div className="flex items-center gap-1">
                                {["node", "python", "ts"].map((lang) => (
                                    <button
                                        key={lang}
                                        onClick={() => setSelectedLang(lang)}
                                        className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded ${selectedLang === lang ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40" : "text-slate-500"
                                            }`}
                                    >
                                        {lang}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="relative">
                            <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[10px] font-mono text-slate-300 overflow-x-auto max-h-48">
                                {getCodeSnippet()}
                            </pre>
                            <button
                                onClick={copySnippet}
                                className="absolute top-2 right-2 bg-slate-800 hover:bg-slate-700 text-slate-300 p-1.5 rounded text-xs"
                            >
                                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Nexus Core Conversion Hook */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-950/40 via-slate-900 to-amber-950/30 border border-cyan-500/30 p-6 md:p-8">
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="space-y-2 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold">
                            <Sparkles className="w-3.5 h-3.5" /> Nexus Core Agentic Automation
                        </div>
                        <h3 className="text-xl font-bold text-white tracking-tight">
                            Tired of webhooks failing silently when API schemas change?
                        </h3>
                        <p className="text-sm text-slate-300 leading-relaxed">
                            Nexus Core deploys autonomous agentic workflows that automatically detect schema variations, heal broken endpoints in real time, and handle intelligent retries without manual developer intervention.
                        </p>
                    </div>

                    <a
                        href="https://nexusthecore.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-black font-bold px-6 py-3 rounded-xl text-sm transition shadow-lg shadow-cyan-500/20 whitespace-nowrap"
                    >
                        Explore Self-Healing Workflows <ArrowRight className="w-4 h-4" />
                    </a>
                </div>
            </div>
        </div>
    );
}