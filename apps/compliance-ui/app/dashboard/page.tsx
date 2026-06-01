'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';

export default function DashboardPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setFileName(file.name);
    }
  };

  const runWorkflow = async () => {
    if (!uploadedFile) return;
    setIsProcessing(true);
    setCurrentStep(0);
    setError(null);

    try {
      // Upload file to backend
      const formData = new FormData();
      formData.append('file', uploadedFile);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/compliance/start`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Failed to start compliance workflow');
      const { jobId } = await res.json();

      // Listen for job progress via SSE
      const eventSource = new EventSource(`${process.env.NEXT_PUBLIC_API_URL}/compliance/${jobId}/stream`);

      eventSource.onmessage = (e) => {
        const event = JSON.parse(e.data);

        if (stepMap[event.type] !== undefined) {
          setCurrentStep(stepMap[event.type]);
        }

        if (event.type === 'completed') {
          setIsProcessing(false);
          eventSource.close();
        }
      };

      eventSource.onerror = (err) => {
        setError('Streaming connection failed.');
        setIsProcessing(false);
        eventSource.close();
      };
    } catch (err: any) {
      setError(err.message || 'Workflow start failed');
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
            Ops Console v4.2
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Node Status: <strong className="text-emerald-400">Optimal</strong></span>
          </div>
          <span className="text-slate-700">|</span>
          <Link href="/auth" className="hover:text-white transition-colors uppercase tracking-widest text-[10px] font-bold">Terminate Session</Link>
        </div>
      </nav>

      {/* Workspace Split Grid */}
      <div className="flex-1 grid lg:grid-cols-12 max-w-7xl w-full mx-auto p-6 gap-6 items-stretch">
        {/* Left Side: ingestion system */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          <div className="bg-slate-900/20 border border-white/5 rounded-2xl p-6 flex-1 flex flex-col justify-between">
            <div>
              <h2 className="text-xs uppercase font-black tracking-widest text-slate-400 mb-2">Ingestion Engine</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Feed trade manifests, global commercial invoices, or loading bills into the asynchronous execution pipeline.
              </p>
            </div>

            {/* File Upload */}
            <div
              onClick={() => !isProcessing && fileInputRef.current?.click()}
              className={`border border-dashed my-6 rounded-xl p-8 text-center cursor-pointer transition-all ${
                fileName
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
                {fileName ? '✓ Document Loaded' : 'Select or Drop Cargo Invoice PDF'}
              </p>
              <p className="text-[10px] font-medium text-slate-600">
                {fileName ? fileName : 'Zero layout alignment setup required'}
              </p>
            </div>

            {error && (
              <div className="text-red-500 text-xs mb-2 text-center">{error}</div>
            )}

            <button
              disabled={!uploadedFile || isProcessing}
              onClick={runWorkflow}
              className={`w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition duration-150 ${
                uploadedFile && !isProcessing
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/10 border border-blue-400/30'
                  : 'bg-slate-950 text-slate-600 border border-white/5 cursor-not-allowed'
              }`}
            >
              {isProcessing ? 'Processing Swarm Pipeline...' : 'Execute Compliance Parsing'}
            </button>
          </div>
        </div>

        {/* Right Side: Network Outputs / Logs telemetry */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <div className="bg-slate-950 border border-white/10 rounded-2xl p-6 flex-1 flex flex-col font-mono justify-between relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-slate-700 to-transparent" />

            <div>
              <div className="flex justify-between items-center pb-4 border-b border-white/5 mb-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pipeline Manifest Status</span>
                <span className="text-[9px] text-slate-500 uppercase font-bold">Asynchronous streaming telemetry</span>
              </div>

              {/* Progress Stepper Tracking */}
              <div className="space-y-3">
                {steps.map((step, idx) => {
                  const isActive = isProcessing && currentStep === idx;
                  const isCompleted = !isProcessing && fileName && currentStep >= idx || (isProcessing && currentStep > idx);

                  return (
                    <div
                      key={step.name}
                      className={`p-3 rounded-lg border transition-all ${
                        isActive
                          ? 'bg-blue-600/10 border-blue-500/30 text-blue-400 shadow-[inset_0_1px_6px_rgba(59,130,246,0.1)]'
                          : isCompleted
                          ? 'bg-slate-900/40 border-emerald-500/20 text-emerald-400'
                          : 'bg-slate-900/10 border-white/5 text-slate-600'
                      }`}
                    >
                      <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                        <span>[Layer {idx + 1}] {step.name}</span>
                        <span>{isActive ? 'Computing...' : isCompleted ? 'Verified ✓' : 'Idle'}</span>
                      </div>
                      <p className="text-[10px] font-medium opacity-80 mt-0.5">{step.detail}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Finished Artifact Action */}
            <div className={`mt-4 pt-4 border-t border-white/5 flex justify-between items-center transition-all ${fileName && !isProcessing && currentStep === steps.length - 1 ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
              <div className="text-left">
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                  Generated Compliance Payload
                </p>
                <p className="text-xs text-slate-200 font-bold mt-0.5">
                  NXS_DECLARATION_SIGNED.EDI
                </p>
              </div>
              <Link href="/checkout">
                <button className="bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-lg transition-all">
                  Provision Billing / Download
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}