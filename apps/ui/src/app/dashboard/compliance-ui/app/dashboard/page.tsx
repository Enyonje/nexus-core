'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';

interface LogMessage {
  timestamp: string;
  stage: string;
  message: string;
  type: 'info' | 'success' | 'warn' | 'error';
}

export default function DashboardPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(-1);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const steps = [
    { name: 'OCR parsing', detail: 'Isolating unstructured entities' },
    { name: 'HS classification', detail: 'Cross-analyzing regional tariffs' },
    { name: 'Rules parsing', detail: 'Evaluating AfCFTA rulesets' },
    { name: 'Signature manifest', detail: 'Sealing declaration assets' }
  ];

  const stepMap: Record<string, number> = {
    'invoice.extracted': 0,
    'hs.classified': 1,
    'compliance.checked': 2,
    'certificate.generated': 3,
  };

  const appendLog = (message: string, stage: string = 'SYSTEM', type: LogMessage['type'] = 'info') => {
    const time = new Date().toISOString().split('T')[1].slice(0, 8);
    setLogs((prev) => [...prev, { timestamp: time, stage, message, type }]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setDownloadUrl(null);
    setLogs([]);
    setCurrentStep(-1);

    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setFileName(file.name);
      appendLog(`File attached: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`, 'INGEST', 'info');
    }
  };

  const runWorkflow = async () => {
    if (!uploadedFile) return;
    setIsProcessing(true);
    setCurrentStep(0);
    setError(null);
    setDownloadUrl(null);

    appendLog('Initiating secure pipeline dispatch...', 'ORCHESTRATOR', 'info');

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);

      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      const res = await fetch(`${apiBase}/compliance/start`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Failed to initialize processing job');
      const { jobId } = await res.json();
      appendLog(`Job registered with ID: ${jobId}`, 'ORCHESTRATOR', 'success');

      const eventSource = new EventSource(`${apiBase}/compliance/${jobId}/stream`);

      eventSource.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data);

          if (event.message) {
            appendLog(event.message, event.type?.toUpperCase() || 'NODE', 'info');
          }

          if (stepMap[event.type] !== undefined) {
            setCurrentStep(stepMap[event.type]);
            appendLog(`Step transition: ${steps[stepMap[event.type]].name}`, 'PIPELINE', 'success');
          }

          if (event.type === 'completed') {
            setCurrentStep(3);
            setIsProcessing(false);
            appendLog('All compliance layers executed successfully. Artifact signed.', 'SECURITY', 'success');
            if (event.artifactUrl) {
              setDownloadUrl(event.artifactUrl);
            }
            eventSource.close();
          }
        } catch (err) {
          appendLog('Parsing telemetry event error', 'STREAM', 'warn');
        }
      };

      eventSource.onerror = () => {
        setError('Streaming connection interrupted.');
        appendLog('SSE Event Stream connection lost.', 'NETWORK', 'error');
        setIsProcessing(false);
        eventSource.close();
      };
    } catch (err: any) {
      const errMsg = err.message || 'Workflow start failed';
      setError(errMsg);
      appendLog(errMsg, 'ERROR', 'error');
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-[#020617] text-slate-100 min-h-screen font-sans antialiased flex flex-col">
      {/* HUD Header */}
      <nav className="bg-slate-950/80 border-b border-white/5 px-6 py-4 flex justify-between items-center z-10">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-blue-500" />
            <span className="text-md font-black tracking-widest text-white uppercase">Nexus Core</span>
          </Link>
          <span className="text-[10px] bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2 py-0.5 rounded font-mono font-bold tracking-wider uppercase">
            CrossBorder Console v4.2
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Node Status: <strong className="text-emerald-400">Optimal</strong></span>
          </div>
          <span className="text-slate-700">|</span>
          <Link href="/" className="hover:text-white transition-colors uppercase tracking-widest text-[10px] font-bold">
            Exit Console
          </Link>
        </div>
      </nav>

      {/* Main Workspace */}
      <div className="flex-1 grid lg:grid-cols-12 max-w-7xl w-full mx-auto p-6 gap-6 items-stretch">

        {/* Left: Ingestion Engine */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          <div className="bg-slate-900/20 border border-white/5 rounded-2xl p-6 flex-1 flex flex-col justify-between">
            <div>
              <h2 className="text-xs uppercase font-black tracking-widest text-slate-400 mb-2">Ingestion Engine</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Feed commercial invoices, certificates of origin, or freight bills into the asynchronous execution pipeline.
              </p>

              {/* Upload Dropzone */}
              <div
                onClick={() => !isProcessing && fileInputRef.current?.click()}
                className={`border border-dashed my-6 rounded-xl p-8 text-center cursor-pointer transition-all ${fileName
                  ? 'border-blue-500/40 bg-blue-500/5 text-blue-400'
                  : 'border-white/10 hover:border-white/20 bg-slate-950/40 hover:bg-slate-950/60 text-slate-500'
                  }`}
              >
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  disabled={isProcessing}
                />
                <p className="font-mono text-xs font-bold uppercase tracking-wider mb-1">
                  {fileName ? '✓ Document Loaded' : 'Select Cargo Invoice PDF'}
                </p>
                <p className="text-[10px] font-medium text-slate-600">
                  {fileName ? fileName : 'Zero template setup required'}
                </p>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg mb-4 font-mono">
                  {error}
                </div>
              )}
            </div>

            {/* Pipeline Stage Tracker */}
            <div className="space-y-3 my-4">
              <p className="text-[10px] uppercase font-mono font-bold text-slate-500 tracking-wider">
                Pipeline Progression
              </p>
              {steps.map((step, idx) => {
                const isActive = currentStep === idx;
                const isComplete = currentStep > idx;

                return (
                  <div
                    key={step.name}
                    className={`p-3 rounded-xl border font-mono text-xs transition-all flex justify-between items-center ${isActive
                      ? 'bg-blue-500/10 border-blue-500/40 text-blue-400'
                      : isComplete
                        ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                        : 'bg-slate-950/40 border-white/5 text-slate-600'
                      }`}
                  >
                    <div>
                      <p className="font-bold uppercase text-[11px]">{step.name}</p>
                      <p className="text-[9px] text-slate-500 font-sans">{step.detail}</p>
                    </div>
                    <span className="text-[10px]">
                      {isComplete ? '✓ DONE' : isActive ? '● ACTIVE' : 'WAITING'}
                    </span>
                  </div>
                );
              })}
            </div>

            <button
              disabled={!uploadedFile || isProcessing}
              onClick={runWorkflow}
              className={`w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition duration-150 ${uploadedFile && !isProcessing
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/10 border border-blue-400/30'
                : 'bg-slate-950 text-slate-600 border border-white/5 cursor-not-allowed'
                }`}
            >
              {isProcessing ? 'Processing Swarm Pipeline...' : 'Execute Compliance Parsing'}
            </button>
          </div>
        </div>

        {/* Right: Network Logs & Artifact Output */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <div className="bg-slate-950 border border-white/10 rounded-2xl p-6 flex-1 flex flex-col font-mono justify-between relative overflow-hidden">
            <div>
              <div className="flex justify-between items-center pb-4 mb-4 border-b border-white/5">
                <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                  Swarm Telemetry Output
                </span>
                <span className="text-[10px] text-slate-600 bg-white/5 px-2 py-0.5 rounded">
                  Live Log Feed
                </span>
              </div>

              {/* Console Output Scroll Area */}
              <div className="space-y-2 max-h-[420px] overflow-y-auto text-xs pr-2">
                {logs.length === 0 ? (
                  <p className="text-slate-600 text-center py-20 text-xs">
                    Ready for document upload. Telemetric agent logs will output here in real-time.
                  </p>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="flex items-start gap-2 text-[11px] leading-relaxed">
                      <span className="text-slate-600 select-none">[{log.timestamp}]</span>
                      <span
                        className={`font-bold text-[10px] px-1.5 py-0.2 rounded ${log.type === 'error'
                          ? 'bg-red-500/20 text-red-400'
                          : log.type === 'success'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-blue-500/20 text-blue-400'
                          }`}
                      >
                        {log.stage}
                      </span>
                      <span className="text-slate-300 font-sans">{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Artifact Download Panel */}
            {downloadUrl && (
              <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center bg-blue-500/10 p-4 rounded-xl border border-blue-500/20">
                <div>
                  <p className="text-white text-xs font-bold font-sans">Compliance Artifact Generated</p>
                  <p className="text-[10px] text-slate-400 font-sans">Digitally signed & cross-validated against 2026 customs rules.</p>
                </div>
                <a
                  href={downloadUrl}
                  download
                  className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-bold font-sans uppercase tracking-wider"
                >
                  Download Package
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}