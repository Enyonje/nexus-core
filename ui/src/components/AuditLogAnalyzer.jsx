import React, { useState, useMemo, useRef, useCallback } from "react";
import {
    ShieldAlert,
    ShieldCheck,
    AlertTriangle,
    FileText,
    Upload,
    RefreshCw,
    Search,
    Download,
    Terminal,
    ChevronRight,
    CheckCircle2,
    XCircle,
    Activity,
    FileCode,
    Shield,
    ExternalLink,
    Zap,
    Cpu,
    Lock,
    Sparkles,
    Eye,
    Filter,
    Copy,
    Check
} from "lucide-react";

// Default Production Mock Data
const DEFAULT_LOGS = [
    {
        timestamp: "2026-09-26T19:42:01Z",
        trace_id: "tr-99812-a1",
        event_type: "auth.login.success",
        actor: "admin@enterprise.com",
        ip_address: "197.232.61.12",
        role: "SystemAdmin",
        details: { method: "OAuth2_MFA", status: "200_OK" }
    },
    {
        timestamp: "2026-09-26T19:42:05Z",
        trace_id: "tr-99812-a2",
        event_type: "user.privilege.escalation",
        actor: "service-account-low-priv",
        ip_address: "10.0.4.19",
        role: "Guest",
        details: { granted_role: "SuperAdmin", mechanism: "direct_db_flag_modify" }
    },
    {
        timestamp: "2026-09-26T19:42:10Z",
        trace_id: "tr-99812-a3",
        event_type: "auth.login.failure",
        actor: "unknown_bot",
        ip_address: "185.220.101.5",
        role: "Unknown",
        details: { reason: "invalid_credentials", attempt_count: 14 }
    },
    {
        timestamp: "2026-09-26T19:42:12Z",
        trace_id: "tr-99812-a4",
        event_type: "payment.webhook.payload",
        actor: "stripe_webhook_handler",
        ip_address: "54.187.205.2",
        role: "WebhookService",
        details: { credit_card_raw: "4111-XXXX-XXXX-1111", ssn: "000-12-3456", encrypted: false }
    },
    {
        timestamp: "2026-09-26T19:41:00Z",
        trace_id: null,
        event_type: "data.export.csv",
        actor: "intern@enterprise.com",
        ip_address: "197.232.61.99",
        role: "Analyst",
        details: { records_exported: 450000, table: "customer_financials" }
    }
];

export default function ProductionAuditLogAnalyzer() {
    const [rawInput, setRawInput] = useState(JSON.stringify(DEFAULT_LOGS, null, 2));
    const [selectedFilter, setSelectedFilter] = useState("ALL");
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedLog, setExpandedLog] = useState(null);
    const [copiedId, setCopiedId] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    // Parse Raw Input safely supporting JSON arrays, NDJSON, or plain text
    const parseLogs = useCallback((text) => {
        if (!text || !text.trim()) return [];

        // Attempt standard JSON Parse
        try {
            const parsed = JSON.parse(text);
            return Array.isArray(parsed) ? parsed : [parsed];
        } catch {
            // Fallback: Line-by-line NDJSON / Syslog Parsing
            return text
                .split("\n")
                .map((line) => line.trim())
                .filter((line) => line.length > 0)
                .map((line, idx) => {
                    try {
                        return JSON.parse(line);
                    } catch {
                        return {
                            timestamp: new Date().toISOString(),
                            trace_id: `raw-line-${idx + 1}`,
                            event_type: "raw.syslog.entry",
                            actor: "system",
                            details: { raw: line }
                        };
                    }
                });
        }
    }, []);

    // Compute Anomalies, Risk Score, and Compliance Gaps
    const analysis = useMemo(() => {
        const logs = parseLogs(rawInput);
        const anomalies = [];
        const complianceGaps = new Set();
        let criticalCount = 0;
        let warningCount = 0;

        logs.forEach((log, index) => {
            const str = JSON.stringify(log).toLowerCase();
            const traceId = log.trace_id || log.traceId || null;
            const eventType = String(log.event_type || log.event || "").toLowerCase();
            const details = log.details || {};

            // Rule 1: Privilege Escalation
            if (eventType.includes("privilege") || str.includes("superadmin") || str.includes("root")) {
                criticalCount++;
                anomalies.push({
                    id: `anom-${index}-1`,
                    logIndex: index,
                    severity: "CRITICAL",
                    type: "Unchecked Privilege Escalation",
                    description: "Elevated access rights assigned without standard approval.",
                    mitigation: "Revoke token and execute IAM credential rotation.",
                    traceId,
                    log
                });
                complianceGaps.add("SOC2 CC6.1 (Least Privilege)");
            }

            // Rule 2: Unencrypted PII / Data Leakage
            if (details.encrypted === false || str.includes("ssn") || str.includes("credit_card_raw")) {
                criticalCount++;
                anomalies.push({
                    id: `anom-${index}-2`,
                    logIndex: index,
                    severity: "CRITICAL",
                    type: "Sensitive Data Exposure",
                    description: "Unencrypted PII or PCI data payload detected in log payload.",
                    mitigation: "Implement field-level log redaction filters.",
                    traceId,
                    log
                });
                complianceGaps.add("PCI-DSS v4.0 (Requirement 3)");
                complianceGaps.add("HIPAA Administrative Safeguards");
            }

            // Rule 3: Auth Failures / Brute Force
            if (eventType.includes("failure") || (details.attempt_count && details.attempt_count > 5)) {
                warningCount++;
                anomalies.push({
                    id: `anom-${index}-3`,
                    logIndex: index,
                    severity: "WARNING",
                    type: "Authentication Anomaly",
                    description: "Multiple failed authentication attempts detected.",
                    mitigation: "Enforce IP rate-limiting and trigger Step-Up MFA.",
                    traceId,
                    log
                });
            }

            // Rule 4: Missing Correlation ID
            if (!traceId) {
                warningCount++;
                anomalies.push({
                    id: `anom-${index}-4`,
                    logIndex: index,
                    severity: "WARNING",
                    type: "Missing Distributed Trace",
                    description: "Log entry lacks trace_id, hindering incident correlation.",
                    mitigation: "Configure distributed tracing headers in backend middleware.",
                    traceId: "N/A",
                    log
                });
                complianceGaps.add("SOC2 CC7.2 (Audit Trail Integrity)");
            }
        });

        const penalty = criticalCount * 25 + warningCount * 10;
        const healthScore = Math.max(0, 100 - penalty);
        const riskLevel = healthScore < 50 || criticalCount > 1 ? "HIGH RISK" : healthScore < 85 ? "MODERATE" : "LOW";

        return {
            parsedLogs: logs,
            anomalies,
            complianceGaps: Array.from(complianceGaps),
            metrics: {
                total: logs.length,
                critical: criticalCount,
                warning: warningCount,
                info: Math.max(0, logs.length - (criticalCount + warningCount)),
                healthScore,
                riskLevel
            }
        };
    }, [rawInput, parseLogs]);

    // Filtered Display Items
    const filteredList = useMemo(() => {
        return analysis.parsedLogs
            .map((log, idx) => {
                const itemAnomalies = analysis.anomalies.filter((a) => a.logIndex === idx);
                const severity = itemAnomalies.some((a) => a.severity === "CRITICAL")
                    ? "CRITICAL"
                    : itemAnomalies.some((a) => a.severity === "WARNING")
                        ? "WARNING"
                        : "INFO";

                return { logIndex: idx, log, anomalies: itemAnomalies, severity };
            })
            .filter(({ log, severity }) => {
                if (selectedFilter !== "ALL" && severity !== selectedFilter) return false;
                if (!searchQuery.trim()) return true;
                return JSON.stringify(log).toLowerCase().includes(searchQuery.toLowerCase());
            });
    }, [analysis, selectedFilter, searchQuery]);

    // File Handlers
    const handleFileUpload = (file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => setRawInput(e.target?.result || "");
        reader.readAsText(file);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
    };

    const copyToClipboard = (text, id) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const exportReport = () => {
        const reportData = {
            timestamp: new Date().toISOString(),
            summary: analysis.metrics,
            complianceGaps: analysis.complianceGaps,
            anomalies: analysis.anomalies,
            rawLogs: analysis.parsedLogs
        };
        const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `audit-sentinel-report-${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="min-h-screen bg-[#070a12] text-slate-100 font-sans pb-16 px-4 md:px-8 pt-6 max-w-7xl mx-auto space-y-6">

            {/* Top Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-5 gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <ShieldAlert className="w-6 h-6 text-cyan-400" />
                        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                            Audit Sentinel Pro <Sparkles className="w-4 h-4 text-amber-400" />
                        </h1>
                    </div>
                    <p className="text-slate-400 text-sm flex items-center gap-2 mt-1">
                        <Terminal className="w-4 h-4 text-slate-500" /> Production Security Log Parsing & SOC-2 Compliance Analyzer
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setRawInput(JSON.stringify(DEFAULT_LOGS, null, 2))}
                        className="flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 px-3 py-2 rounded-lg text-xs font-medium transition"
                    >
                        <RefreshCw className="w-3.5 h-3.5 text-cyan-400" /> Reset
                    </button>

                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 px-3 py-2 rounded-lg text-xs font-medium transition"
                    >
                        <Upload className="w-3.5 h-3.5 text-slate-400" /> Load File
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={(e) => handleFileUpload(e.target.files?.[0])}
                        className="hidden"
                        accept=".json,.log,.txt,.ndjson"
                    />

                    <button
                        onClick={exportReport}
                        className="flex items-center gap-1.5 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-4 py-2 rounded-lg text-xs transition shadow-lg shadow-cyan-500/10"
                    >
                        <Download className="w-3.5 h-3.5" /> Export Analysis
                    </button>
                </div>
            </div>

            {/* Security Metrics Dashboard */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex justify-between items-start">
                    <div>
                        <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Total Evaluated</span>
                        <span className="text-2xl font-bold text-white mt-1 block">{analysis.metrics.total}</span>
                        <span className="text-slate-500 text-[11px] flex items-center gap-1 mt-2">
                            <FileText className="w-3 h-3" /> Event records
                        </span>
                    </div>
                    <div className="p-2 bg-slate-800/60 border border-slate-700/50 rounded-lg text-cyan-400">
                        <Activity className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex justify-between items-start">
                    <div>
                        <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Critical Anomalies</span>
                        <span className="text-2xl font-bold text-red-400 mt-1 block">{analysis.metrics.critical}</span>
                        <span className="text-red-400/80 text-[11px] flex items-center gap-1 mt-2">
                            <XCircle className="w-3 h-3" /> Urgent remediation
                        </span>
                    </div>
                    <div className="p-2 bg-red-950/40 border border-red-800/50 rounded-lg text-red-400">
                        <Zap className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex justify-between items-start">
                    <div>
                        <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Warnings</span>
                        <span className="text-2xl font-bold text-amber-400 mt-1 block">{analysis.metrics.warning}</span>
                        <span className="text-amber-400/80 text-[11px] flex items-center gap-1 mt-2">
                            <AlertTriangle className="w-3 h-3" /> Audit trail gaps
                        </span>
                    </div>
                    <div className="p-2 bg-amber-950/40 border border-amber-800/50 rounded-lg text-amber-400">
                        <Cpu className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex justify-between items-start">
                    <div>
                        <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Security Score</span>
                        <span
                            className={`text-2xl font-bold mt-1 block ${analysis.metrics.healthScore < 60 ? "text-red-400" : "text-emerald-400"
                                }`}
                        >
                            {analysis.metrics.healthScore} / 100
                        </span>
                        <span className="text-emerald-400/80 text-[11px] flex items-center gap-1 mt-2">
                            <CheckCircle2 className="w-3 h-3" /> Risk: {analysis.metrics.riskLevel}
                        </span>
                    </div>
                    <div className="p-2 bg-emerald-950/40 border border-emerald-800/50 rounded-lg text-emerald-400">
                        {analysis.metrics.healthScore >= 80 ? <ShieldCheck className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                    </div>
                </div>
            </div>

            {/* Compliance Framework Gaps Banner */}
            {analysis.complianceGaps.length > 0 && (
                <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-4">
                    <h3 className="text-xs font-semibold uppercase text-red-400 tracking-wider flex items-center gap-2 mb-2">
                        <Lock className="w-4 h-4 text-red-400" /> Active Compliance Violations Detected
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {analysis.complianceGaps.map((gap, i) => (
                            <span
                                key={i}
                                className="inline-flex items-center gap-1.5 bg-red-950/80 text-red-300 border border-red-800/60 px-2.5 py-1 rounded-md text-xs font-mono"
                            >
                                <FileCode className="w-3.5 h-3.5 text-red-400" /> {gap}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Drop Zone / Log Input Box */}
            <div
                onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`rounded-xl border transition p-4 ${isDragging ? "border-cyan-500 bg-cyan-950/10" : "border-slate-800 bg-slate-900/40"
                    }`}
            >
                <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5 text-cyan-400" /> Live Stream / Raw JSON Log Editor
                    </label>
                    <span className="text-[11px] text-slate-500">Drag & drop .json or syslog files directly</span>
                </div>
                <textarea
                    rows={5}
                    value={rawInput}
                    onChange={(e) => setRawInput(e.target.value)}
                    placeholder="Paste log items here..."
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-lg p-3 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500/50 transition resize-y"
                />
            </div>

            {/* Search & Severity Filter Bar */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 space-y-4">
                <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
                    <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 w-full sm:w-80">
                        <Search className="w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search trace ID, actor, payload..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-transparent text-xs text-slate-200 outline-none w-full placeholder:text-slate-600"
                        />
                    </div>

                    <div className="flex items-center gap-1.5 self-start sm:self-auto">
                        <Filter className="w-3.5 h-3.5 text-slate-500 mr-1" />
                        {["ALL", "CRITICAL", "WARNING", "INFO"].map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setSelectedFilter(filter)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${selectedFilter === filter
                                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                                    : "bg-slate-800/60 text-slate-400 border border-transparent hover:bg-slate-800"
                                    }`}
                            >
                                {filter}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Dynamic Log Feed List */}
                <div className="space-y-3 font-mono text-xs">
                    {filteredList.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 bg-slate-950/40 rounded-lg border border-slate-800/50">
                            No matching log traces found.
                        </div>
                    ) : (
                        filteredList.map(({ logIndex, log, anomalies, severity }) => {
                            const isExpanded = expandedLog === logIndex;
                            return (
                                <div
                                    key={logIndex}
                                    className={`rounded-xl border transition-all ${severity === "CRITICAL"
                                        ? "border-red-900/50 bg-red-950/10 hover:border-red-800/70"
                                        : severity === "WARNING"
                                            ? "border-amber-900/50 bg-amber-950/10 hover:border-amber-800/70"
                                            : "border-slate-800/80 bg-slate-950/60 hover:border-slate-700"
                                        }`}
                                >
                                    <div className="p-3.5 flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <button
                                                type="button"
                                                onClick={() => setExpandedLog(isExpanded ? null : logIndex)}
                                                className="p-1 hover:bg-slate-800 rounded transition"
                                            >
                                                <ChevronRight
                                                    className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${isExpanded ? "rotate-90 text-cyan-400" : ""
                                                        }`}
                                                />
                                            </button>
                                            <span className="text-slate-400 text-[11px] shrink-0">{log.timestamp || "N/A"}</span>
                                            <span className="text-slate-200 font-semibold truncate">{log.event_type || "log_event"}</span>
                                            {log.actor && <span className="text-slate-500 hidden md:inline-block">({String(log.actor)})</span>}
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            <span
                                                className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${severity === "CRITICAL"
                                                    ? "bg-red-950/80 text-red-400 border-red-800/60"
                                                    : severity === "WARNING"
                                                        ? "bg-amber-950/80 text-amber-400 border-amber-800/60"
                                                        : "bg-slate-800 text-slate-400 border-slate-700"
                                                    }`}
                                            >
                                                {severity}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setExpandedLog(isExpanded ? null : logIndex)}
                                                className="text-slate-400 hover:text-white p-1"
                                                title="Toggle Inspector"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Expanded JSON Inspector & Mitigation Rules */}
                                    {isExpanded && (
                                        <div className="px-4 pb-4 pt-2 border-t border-slate-800/60 space-y-3">
                                            <div className="relative bg-slate-900/90 p-3 rounded-lg border border-slate-800 overflow-x-auto text-slate-300">
                                                <button
                                                    onClick={() => copyToClipboard(JSON.stringify(log, null, 2), `copy-${logIndex}`)}
                                                    className="absolute top-2 right-2 text-slate-400 hover:text-white bg-slate-800 p-1.5 rounded"
                                                    title="Copy JSON"
                                                >
                                                    {copiedId === `copy-${logIndex}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                                </button>
                                                <pre>{JSON.stringify(log, null, 2)}</pre>
                                            </div>

                                            {anomalies.length > 0 && (
                                                <div className="space-y-2">
                                                    {anomalies.map((anom) => (
                                                        <div
                                                            key={anom.id}
                                                            className="p-3 rounded-lg bg-red-950/30 border border-red-900/50 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2"
                                                        >
                                                            <div className="flex items-center gap-2 text-red-300">
                                                                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                                                                <span>
                                                                    <strong>{anom.type}:</strong> {anom.description}
                                                                </span>
                                                            </div>
                                                            <span className="text-cyan-400 text-[11px] font-sans flex items-center gap-1 shrink-0">
                                                                Action: {anom.mitigation} <ExternalLink className="w-3 h-3" />
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}