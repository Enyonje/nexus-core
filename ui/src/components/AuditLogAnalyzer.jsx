import React, { useState, useMemo, useRef } from "react";
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
    Eye
} from "lucide-react";

const SAMPLE_AUDIT_LOGS = JSON.stringify(
    [
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
        },
        {
            timestamp: "2026-09-26T19:43:18Z",
            trace_id: "tr-99812-a6",
            event_type: "agent.mission.executed",
            actor: "nexus_sentinel_agent",
            ip_address: "127.0.0.1",
            role: "AutonomousWorker",
            details: { objective: "auto_heal_rate_limit_lockout", status: "resolved" }
        }
    ],
    null,
    2
);

export default function AuditLogAnalyzer() {
    const [logInput, setLogInput] = useState(SAMPLE_AUDIT_LOGS);
    const [selectedFilter, setSelectedFilter] = useState("ALL");
    const [searchQuery, setSearchQuery] = useState("");
    const fileInputRef = useRef(null);

    // === Analysis Logic ===
    const analysisResult = useMemo(() => {
        if (!logInput || !logInput.trim()) {
            return {
                parsedLogs: [],
                anomalies: [],
                metrics: { total: 0, critical: 0, warning: 0, info: 0, healthScore: 100, riskLevel: "LOW" },
                complianceGaps: []
            };
        }

        let logs = [];
        try {
            const parsed = JSON.parse(logInput);
            logs = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
            const lines = logInput.split("\n").filter(l => l.trim() !== "");
            logs = lines.map((line, idx) => {
                try {
                    return JSON.parse(line);
                } catch {
                    return {
                        timestamp: new Date().toISOString(),
                        trace_id: `raw-line-${idx + 1}`,
                        event_type: "raw_syslog_entry",
                        raw_content: line
                    };
                }
            });
        }

        const anomalies = [];
        const complianceGaps = [];
        let criticalCount = 0;
        let warningCount = 0;
        let prevTimestamp = null;

        logs.forEach((log, index) => {
            const logStr = JSON.stringify(log).toLowerCase();
            const traceId = log.trace_id || log.traceId || log.id || null;
            const eventType = (log.event_type || log.event || log.action || "").toLowerCase();
            const details = log.details || {};

            if (eventType.includes("privilege") || logStr.includes("superadmin")) {
                criticalCount++;
                anomalies.push({ id: `anom-${index}-1`, logIndex: index, severity: "CRITICAL", type: "Privilege Escalation", description: "Role escalation detected.", mitigation: "Revoke IAM tokens.", traceId, log });
                complianceGaps.push({ framework: "SOC2 CC6.1", gap: "Least Privilege Violation", severity: "CRITICAL" });
            }

            if (details.encrypted === false || logStr.includes("credit_card_raw") || logStr.includes("ssn")) {
                criticalCount++;
                anomalies.push({ id: `anom-${index}-2`, logIndex: index, severity: "CRITICAL", type: "Unencrypted Sensitive Payload", description: "Unencrypted PII detected.", mitigation: "Mask and encrypt sensitive fields.", traceId, log });
                complianceGaps.push({ framework: "PCI-DSS v4.0", gap: "Encryption Violation", severity: "CRITICAL" });
            }

            if (eventType.includes("failure") || (details.attempt_count && details.attempt_count > 5)) {
                warningCount++;
                anomalies.push({ id: `anom-${index}-3`, logIndex: index, severity: "WARNING", type: "Authentication Failure", description: "Multiple failed attempts.", mitigation: "Apply rate-limiting and MFA.", traceId, log });
            }

            if (!traceId) {
                warningCount++;
                anomalies.push({ id: `anom-${index}-4`, logIndex: index, severity: "WARNING", type: "Missing Trace ID", description: "No trace correlation ID.", mitigation: "Inject UUID headers.", traceId: "MISSING", log });
                complianceGaps.push({ framework: "SOC2 CC7.2", gap: "Incomplete Audit Trail", severity: "WARNING" });
            }

            if (log.timestamp) {
                const currentTs = new Date(log.timestamp).getTime();
                if (prevTimestamp && currentTs < prevTimestamp) {
                    warningCount++;
                    anomalies.push({ id: `anom-${index}-5`, logIndex: index, severity: "WARNING", type: "Out-of-Order Timestamp", description: "Chronological disorder detected.", mitigation: "Sync with NTP servers.", traceId, log });
                }
                if (!isNaN(currentTs)) prevTimestamp = currentTs;
            }
        });

        const penalty = criticalCount * 25 + warningCount * 10;
        const healthScore = Math.max(0, 100 - penalty);
        let riskLevel = "LOW";
        if (healthScore < 60 || criticalCount > 0) riskLevel = "CRITICAL";
        else if (healthScore < 85 || warningCount > 0) riskLevel = "MEDIUM";

        return {
            parsedLogs: logs,
            anomalies,
            metrics: { total: logs.length, critical: criticalCount, warning: warningCount, info: logs.length - (criticalCount + warningCount), healthScore, riskLevel },
            complianceGaps
        };
    }, [logInput]);

    const filteredAnomaliesAndLogs = useMemo(() => {
        return analysisResult.parsedLogs.map((log, idx) => {
            const associatedAnomalies = analysisResult.anomalies.filter(a => a.logIndex === idx);
            const highestSeverity = associatedAnomalies.some(a => a.severity === "CRITICAL")
                ? "CRITICAL"
                : associatedAnomalies.some(a => a.severity === "WARNING")
                    ? "WARNING"
                    : "INFO";
            return { logIndex: idx, log, anomalies: associatedAnomalies, severity: highestSeverity };
        }).filter(item => {
            if (selectedFilter === "CRITICAL" && item.severity !== "CRITICAL") return false;
            if (selectedFilter === "WARNING" && item.severity !== "WARNING") return false;
            if (selectedFilter === "INFO" && item.severity !== "INFO") return false;
            if (searchQuery.trim() !== "") {
                const query = searchQuery.toLowerCase();
                const logStr = JSON.stringify(item.log).toLowerCase();
                return logStr.includes(query);
            }
            return true;
        });
    }, [analysisResult, selectedFilter, searchQuery]);

    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result;
            if (typeof content === "string") {
                setLogInput(content);
            }
        };
        reader.readAsText(file);
    };

    const downloadAnalysisReport = () => {
        const reportData = {
            generatedAt: new Date().toISOString(),
            platform: "Nexus Core Audit Sentinel",
            metrics: analysisResult.metrics,
            complianceGaps: analysisResult.complianceGaps,
            anomaliesDetected: analysisResult.anomalies
        };

        const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `nexus-audit-analysis-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="min-h-screen bg-[#070a12] text-slate-100 font-sans selection:bg-cyan-500 selection:text-black pb-16">
            {/* Header, metrics, compliance gaps, log explorer, and CTA sections go here */}
        </div>
    );
}
