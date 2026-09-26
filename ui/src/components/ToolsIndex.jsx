import React from "react";
import { FileCode, Shield, Zap, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";

export default function ToolsIndex() {
    // JSON-LD structured data for SEO
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": "Nexus Core Tools",
        "url": "https://nexusthecore.com/tools",
        "applicationCategory": "DeveloperApplication",
        "operatingSystem": "Any",
        "description": "Free developer utilities for audit log analysis, compliance checking, and CI/CD validation.",
        "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
        },
        "softwareHelp": [
            {
                "@type": "WebApplication",
                "name": "Audit Log Analyzer",
                "url": "https://nexusthecore.com/tools/auditloganalyzer",
                "description": "Paste audit logs and instantly detect anomalies, compliance gaps, and security risks."
            },
            {
                "@type": "WebApplication",
                "name": "Compliance Checker",
                "url": "https://nexusthecore.com/tools/compliancechecker",
                "description": "Run automated checks against SOC2, PCI-DSS, and ISO27001 frameworks."
            },
            {
                "@type": "WebApplication",
                "name": "CI/CD Validator",
                "url": "https://nexusthecore.com/tools/cicdvalidator",
                "description": "Validate pipeline configs for secrets, SSL, and deployment hygiene."
            }
        ]
    };

    // Tools array for rendering cards
    const tools = [
        {
            name: "Audit Log Analyzer",
            description: "Paste audit logs and instantly detect anomalies, compliance gaps, and security risks.",
            icon: <FileCode className="h-5 w-5 text-cyan-400" />,
            path: "/tools/auditloganalyzer"
        },
        {
            name: "Compliance Checker",
            description: "Run automated checks against SOC2, PCI-DSS, and ISO27001 frameworks.",
            icon: <Shield className="h-5 w-5 text-emerald-400" />,
            path: "/tools/compliancechecker"
        },
        {
            name: "CI/CD Validator",
            description: "Validate your pipeline configs for secrets, SSL, and deployment hygiene.",
            icon: <Zap className="h-5 w-5 text-amber-400" />,
            path: "/tools/cicdvalidator"
        }
    ];

    return (
        <div className="min-h-screen bg-[#070a12] text-slate-100 font-sans pb-16">
            <Helmet>
                <title>Nexus Core Tools – Free Developer Utilities</title>
                <meta
                    name="description"
                    content="Discover free developer tools from Nexus Core: Audit Log Analyzer, Compliance Checker, and CI/CD Validator."
                />

                {/* Open Graph tags */}
                <meta property="og:title" content="Nexus Core Tools – Free Developer Utilities" />
                <meta property="og:description" content="Discover free developer tools from Nexus Core: Audit Log Analyzer, Compliance Checker, and CI/CD Validator." />
                <meta property="og:url" content="https://nexusthecore.com/tools" />
                <meta property="og:type" content="website" />
                <meta property="og:image" content="https://nexusthecore.com/public/og-tools-banner.png" />

                {/* Twitter Card tags */}
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content="Nexus Core Tools – Free Developer Utilities" />
                <meta name="twitter:description" content="Discover free developer tools from Nexus Core: Audit Log Analyzer, Compliance Checker, and CI/CD Validator." />
                <meta name="twitter:image" content="https://nexusthecore.com/public/og-tools-banner.png" />

                {/* JSON-LD structured data */}
                <script type="application/ld+json">
                    {JSON.stringify(structuredData)}
                </script>
            </Helmet>

            <header className="border-b border-slate-800/80 bg-[#0b0f19]/80 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <h1 className="text-lg font-extrabold text-white tracking-wider">NEXUS CORE TOOLS</h1>
                    <span className="text-xs text-slate-400">Free Developer Utilities</span>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
                <h2 className="text-2xl font-bold text-white mb-6">Explore Tools</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tools.map((tool) => (
                        <Link
                            key={tool.name}
                            to={tool.path}
                            className="bg-[#0e1424] border border-slate-800/90 rounded-2xl p-5 shadow-xl hover:border-cyan-500/40 transition-colors"
                        >
                            <div className="flex items-center space-x-3 mb-3">
                                {tool.icon}
                                <span className="text-lg font-bold text-white">{tool.name}</span>
                            </div>
                            <p className="text-sm text-slate-400">{tool.description}</p>
                        </Link>
                    ))}
                </div>

                <div className="mt-8 text-xs text-slate-500 font-mono flex items-center space-x-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span>All tools run client-side — zero server footprint.</span>
                </div>
            </main>
        </div>
    );
}
