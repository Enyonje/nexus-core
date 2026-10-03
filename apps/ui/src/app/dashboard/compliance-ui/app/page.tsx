'use client';

import React, { useState, useRef } from 'react';

// ==========================================
// OPTION 3: JSON-LD Structured Data Schema
// ==========================================
const jsonLdSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  'name': 'Nexus Core CrossBorder Compliance Console',
  'operatingSystem': 'Web',
  'applicationCategory': 'BusinessApplication',
  'description': 'Automated cross-border trade compliance pipeline featuring OCR invoice extraction, HS classification, and AfCFTA ruleset evaluation.',
  'offers': {
    '@type': 'Offer',
    'price': '0.00',
    'priceCurrency': 'USD',
  },
  'publisher': {
    '@type': 'Organization',
    'name': 'Nexus Core',
    'url': 'https://nexusthecore.com',
  },
};

interface AuditLog {
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

export default function ComplianceConsolePage() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [pipelineStage, setPipelineStage] = useState<'idle' | 'ocr' | 'hs_classification' | 'afcfta_rules' | 'complete'>('idle');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Safe helper to read client-side environment variables without triggering 'process is not defined'
  const getEnvVar = (key: string, defaultValue: string = ''): string => {
    if (typeof window !== 'undefined' && typeof process !== 'undefined' && process.env) {
      return process.env[key] || defaultValue;
    }
    return defaultValue;
  };

  // Compliance execution engine simulator
  const handleRunPipeline = () => {
    if (!file) return;

    setIsProcessing(true);
    setPipelineStage('ocr');

    const apiEndpoint = getEnvVar('NEXT_PUBLIC_COMPLIANCE_API', 'https://api.nexusthecore.com/v1');

    setLogs([
      { timestamp: new Date().toLocaleTimeString(), type: 'info', message: `INGEST: File attached: ${file.name} (${(file.size / 1024).toFixed(1)} KB)` },
      { timestamp: new Date().toLocaleTimeString(), type: 'info', message: `ORCHESTRATOR: Initiating secure pipeline dispatch via ${apiEndpoint}...` },
    ]);

    setTimeout(() => {
      setPipelineStage('hs_classification');
      setLogs((prev) => [
        ...prev,
        { timestamp: new Date().toLocaleTimeString(), type: 'info', message: 'OCR READ: Document layout parsed. Extracting line items & origin criteria...' },
        { timestamp: new Date().toLocaleTimeString(), type: 'success', message: 'HS Code Identified: 8708.30 / 8708.50 (Vehicle Components)' },
      ]);
    }, 1500);

    setTimeout(() => {
      setPipelineStage('afcfta_rules');
      setLogs((prev) => [
        ...prev,
        { timestamp: new Date().toLocaleTimeString(), type: 'info', message: 'EVALUATOR: Parsing AfCFTA Protocol Rulesets (Annex 2)...' },
        { timestamp: new Date().toLocaleTimeString(), type: 'success', message: 'Origin Rule Satisfied: Article 4 (Change in Tariff Heading - CTH Met)' },
      ]);
    }, 3000);

    setTimeout(() => {
      setPipelineStage('complete');
      setIsProcessing(false);
      setLogs((prev) => [
        ...prev,
        { timestamp: new Date().toLocaleTimeString(), type: 'success', message: 'STATUS 200: Pipeline complete. Zero compliance flags detected. Clearance ready.' },
      ]);
    }, 4200);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setPipelineStage('idle');
      setLogs([]);
    }
  };

  return (
    <>
      {/* Inject Option 3: JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSchema) }}
      />

      <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 font-sans">
        {/* SEO Header */}
        <header className="max-w-7xl mx-auto mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-4 gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                <span className="bg-blue-600 text-xs px-2.5 py-1 rounded font-mono uppercase tracking-wide text-white">
                  Nexus Core
                </span>
                CrossBorder Compliance Console v4.2
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Automated cargo document parsing, HS classification &amp; AfCFTA tariff validation.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-400 ring-1 ring-inset ring-emerald-400/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mr-2 animate-pulse" />
                AfCFTA Ruleset Active
              </span>
            </div>
          </div>
        </header>

        {/* Console Workspace */}
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Panel 1: Document Upload */}
          <section aria-label="Document Upload Interface" className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-base font-semibold text-white mb-1 flex items-center justify-between">
                <span>1. Cargo Document Intake</span>
                <span className="text-xs text-slate-500 font-mono">OCR Engine</span>
              </h2>
              <p className="text-xs text-slate-400 mb-4">
                Upload Bills of Lading, Commercial Invoices, or Cargo Toolkits.
              </p>

              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer ${file ? 'border-emerald-500/50 bg-emerald-950/10' : 'border-slate-800 hover:border-blue-500 bg-slate-950/40'
                  }`}
              >
                <input
                  id="document-upload"
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,image/*"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={isProcessing}
                  aria-label="Upload Cargo Invoice or Bill of Lading PDF"
                />

                <div className="space-y-2">
                  <div className="mx-auto h-10 w-10 text-slate-400 flex items-center justify-center bg-slate-800 rounded-full">
                    📄
                  </div>
                  {file ? (
                    <div>
                      <p className="text-sm text-emerald-400 font-medium truncate max-w-[200px] mx-auto">{file.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{(file.size / 1024).toFixed(1)} KB — Click to change</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-slate-300 font-medium">Click to upload document</p>
                      <p className="text-xs text-slate-500 mt-1">Supports PDF, PNG, TIFF up to 25MB</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 space-y-3">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Target Protocol</span>
                <span className="text-slate-200 font-mono">AfCFTA Annex 2</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>Classification Engine</span>
                <span className="text-slate-200 font-mono">WCO HS2022 / 2026</span>
              </div>
              <button
                type="button"
                onClick={handleRunPipeline}
                disabled={!file || isProcessing}
                className={`w-full py-2.5 px-4 rounded text-xs font-semibold transition-all ${!file || isProcessing
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20'
                  }`}
              >
                {isProcessing ? 'Processing Compliance Pipeline...' : 'Run Compliance Evaluation'}
              </button>
            </div>
          </section>

          {/* Panel 2: Live Audit Log Console */}
          <section aria-label="Pipeline Console Output" className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-white">2. Evaluation Logs &amp; Tariff Audit</h2>
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${pipelineStage === 'idle' ? 'bg-slate-600' : 'bg-blue-500 animate-ping'}`} />
                  <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">{pipelineStage}</span>
                </div>
              </div>

              {/* Progress Stage Tracker */}
              <div className="grid grid-cols-4 gap-2 mb-6">
                {[
                  { key: 'ocr', label: '1. OCR Read' },
                  { key: 'hs_classification', label: '2. HS Mapping' },
                  { key: 'afcfta_rules', label: '3. AfCFTA Rules' },
                  { key: 'complete', label: '4. Clearance' },
                ].map((step, idx) => {
                  const isActive = pipelineStage === step.key;
                  const isDone =
                    pipelineStage === 'complete' ||
                    (pipelineStage === 'afcfta_rules' && idx < 2) ||
                    (pipelineStage === 'hs_classification' && idx < 1);

                  return (
                    <div
                      key={step.key}
                      className={`p-2.5 rounded border text-center transition-all ${isDone
                        ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-400'
                        : isActive
                          ? 'border-blue-500 bg-blue-950/30 text-blue-300'
                          : 'border-slate-800 bg-slate-950/40 text-slate-600'
                        }`}
                    >
                      <p className="text-[11px] font-mono font-medium">{step.label}</p>
                    </div>
                  );
                })}
              </div>

              {/* Console Execution Output */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs text-slate-300 h-64 overflow-y-auto space-y-2">
                {logs.length === 0 ? (
                  <p className="text-slate-600 italic">// Awaiting payload execution. Select a file and click 'Run Compliance Evaluation'...</p>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="flex items-start gap-2 leading-relaxed">
                      <span className="text-slate-600 shrink-0">[{log.timestamp}]</span>
                      <span
                        className={
                          log.type === 'success'
                            ? 'text-emerald-400'
                            : log.type === 'error'
                              ? 'text-rose-400'
                              : log.type === 'warning'
                                ? 'text-amber-400'
                                : 'text-blue-400'
                        }
                      >
                        {log.message}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Actions Footer */}
            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Audit Trail ID: <code className="text-slate-400">NX-COMP-2026-8801</code>
              </span>
              <button
                type="button"
                disabled={logs.length === 0}
                onClick={() => {
                  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
                  const downloadAnchor = document.createElement('a');
                  downloadAnchor.setAttribute('href', dataStr);
                  downloadAnchor.setAttribute('download', 'compliance_audit_log.json');
                  document.body.appendChild(downloadAnchor);
                  downloadAnchor.click();
                  downloadAnchor.remove();
                }}
                className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold px-4 py-2 rounded border border-slate-700 transition-colors"
              >
                Export JSON Log
              </button>
            </div>
          </section>

        </div>
      </main>
    </>
  );
}