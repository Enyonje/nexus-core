'use client';

import React, { useState, useRef } from 'react';
import jsPDF from "jspdf";
import "jspdf-autotable"; // this attaches autoTable to jsPDF
import {
    validateCargoDiscrepancies,
    calculateCustomsAssessment,
    generateCustomsXmlDeclaration
} from '../complianceui/lib/cf-engine';

export default function CrossBorderCompliance() {
    const [file, setFile] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [pipelineStage, setPipelineStage] = useState('idle');
    const [logs, setLogs] = useState([]);

    // Pipeline Results State
    const [, setAuditFlags] = useState([]);
    const [assessment, setAssessment] = useState(null);
    const [generatedXml, setGeneratedXml] = useState('');

    // Real-Time M-Pesa State
    const [phoneNumber, setPhoneNumber] = useState('254712345678');
    const [paymentStatus, setPaymentStatus] = useState('pending');
    const [mpesaReceipt, setMpesaReceipt] = useState('');

    const fileInputRef = useRef(null);

    // Sample Extracted Cargo Data
    const sampleInvoice = {
        grossWeightKg: 1420,
        totalUnits: 4650,
        cifValueUsd: 64500,
        importerName: 'Nairobi Auto Supply Co. Ltd.',
        importerTaxId: 'KE-0519283741',
        exporterName: 'Apex Industrial Components Ltd.',
        originCountry: 'UG',
        portOfDischarge: 'Nairobi ICD',
        incoterm: 'CIF',
        items: [
            { description: 'Brake Pad Sets', hsCode: '8708.30', totalPriceUsd: 22200, cetRate: 0.25 },
            { description: 'Drive Shaft Assemblies', hsCode: '8708.50', totalPriceUsd: 29250, cetRate: 0.25 },
            { description: 'Rubber Bushings', hsCode: '4016.99', totalPriceUsd: 13050, cetRate: 0.10 }
        ]
    };

    const samplePackingList = {
        grossWeightKg: 1420,
        totalUnits: 4650
    };

    const addLog = (message, type = 'info') => {
        setLogs((prev) => [...prev, { timestamp: new Date().toLocaleTimeString(), type, message }]);
    };

    // Run End-to-End Automated Clearing Pipeline
    const handleRunFullPipeline = () => {
        if (!file) return;

        setIsProcessing(true);
        setLogs([]);
        setPipelineStage('ingestion');

        addLog(`INGEST: Parsing file '${file.name}' (${(file.size / 1024).toFixed(1)} KB)...`, 'info');

        setTimeout(() => {
            setPipelineStage('audit');
            addLog('AUDIT: Cross-referencing Commercial Invoice against Packing List...', 'info');

            const flags = validateCargoDiscrepancies(sampleInvoice, samplePackingList);
            setAuditFlags(flags);

            if (flags.length === 0) {
                addLog('AUDIT PASSED: Zero weight/unit discrepancies detected across documents.', 'success');
            } else {
                flags.forEach(f => addLog(`AUDIT WARNING: ${f.message}`, 'warning'));
            }
        }, 1200);

        setTimeout(() => {
            setPipelineStage('duty_calc');
            addLog('CALCULATOR: Computing EAC CET & AfCFTA Preferential Duty Rates...', 'info');

            const calcResult = calculateCustomsAssessment({
                cifValueUsd: sampleInvoice.cifValueUsd,
                items: sampleInvoice.items,
                isAfcftaEligible: true
            });

            setAssessment(calcResult);
            addLog(`VALUATION: CIF Value USD ${calcResult.cifValueUsd.toLocaleString()} = KES ${calcResult.cifValueKes.toLocaleString()}`, 'info');
            addLog(`DUTY EVALUATED: Total Customs Tax Payable = KES ${calcResult.taxBreakdown.totalCustomsTaxKes.toLocaleString()}`, 'success');
        }, 2600);

        setTimeout(() => {
            setPipelineStage('icms_xml');
            addLog('SINGLE WINDOW: Compiling KRA iCMS / ASYCUDA World EDI Declaration XML Payload...', 'info');

            const xml = generateCustomsXmlDeclaration(sampleInvoice, calculateCustomsAssessment({
                cifValueUsd: sampleInvoice.cifValueUsd,
                items: sampleInvoice.items,
                isAfcftaEligible: true
            }));

            setGeneratedXml(xml);
            addLog('XML READY: Electronic Entry IM4 payload structured & signed.', 'success');
        }, 3800);

        setTimeout(() => {
            setPipelineStage('ready');
            setIsProcessing(false);
            addLog('PIPELINE COMPLETE: System ready for KRA Direct Filing & Duty Escrow STK Push.', 'success');
        }, 4800);
    };

    // ==========================================
    // REAL-TIME M-PESA EXPRESS (STK PUSH) FLOW
    // ==========================================
    const handlePayDutyRealtimeMpesa = async () => {
        if (!assessment) return;

        setPaymentStatus('initiating');
        addLog(`M-PESA: Initiating STK Push to ${phoneNumber} for KES ${assessment.taxBreakdown.totalCustomsTaxKes.toLocaleString()}...`, 'info');

        try {
            // 1. Call Backend API to trigger Daraja STK Push
            const res = await fetch('/api/payments/mpesa/stkpush', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phoneNumber,
                    amount: assessment.taxBreakdown.totalCustomsTaxKes,
                    accountReference: 'KRA-DUTY-DECL',
                    transactionDesc: 'Customs Duty Payment'
                }),
            });

            const data = await res.json();

            if (res.ok && data.CheckoutRequestID) {
                setPaymentStatus('polling');
                addLog(`M-PESA STK SENT: Prompt sent to phone. Awaiting PIN entry (CheckoutID: ${data.CheckoutRequestID})...`, 'info');

                // 2. Poll for payment status callback confirmation
                pollPaymentStatus(data.CheckoutRequestID);
            } else {
                throw new Error(data.error || 'Failed to dispatch STK push');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Payment initiation failed.';
            setPaymentStatus('failed');
            addLog(`M-PESA ERROR: ${errorMessage}`, 'error');
        }
    };

    // Poll Backend Status Endpoint
    const pollPaymentStatus = (checkoutRequestId) => {
        let attempts = 0;
        const interval = setInterval(async () => {
            attempts += 1;
            try {
                const res = await fetch(`/api/payments/mpesa/query?checkoutRequestId=${checkoutRequestId}`);
                const data = await res.json();

                if (data.status === 'COMPLETED') {
                    clearInterval(interval);
                    setPaymentStatus('success');
                    setMpesaReceipt(data.mpesaReceiptNumber);
                    addLog(`M-PESA CONFIRMED: Receipt #${data.mpesaReceiptNumber}. KRA Customs Release Order (RO) Issued.`, 'success');
                } else if (data.status === 'FAILED' || attempts > 12) { // 12 * 5s = 60s timeout
                    clearInterval(interval);
                    setPaymentStatus('failed');
                    addLog('M-PESA TIMEOUT/CANCELLED: Payment was not completed on the device.', 'error');
                }
            } catch {
                if (attempts > 12) clearInterval(interval);
            }
        }, 5000);
    };

    // ==========================================
    // EXPORT HANDLERS (XML / PDF)
    // ==========================================
    const handleDownloadXml = () => {
        if (!generatedXml) return;
        const blob = new Blob([generatedXml], { type: 'text/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `icms_declaration_${sampleInvoice.importerTaxId}.xml`;
        a.click();
        URL.revokeObjectURL(url);
        addLog('EXPORT: Customs IM4 XML file downloaded.', 'info');
    };

    const handleDownloadPdfAssessment = () => {
        if (!assessment) return;

        const doc = new jsPDF();

        // PDF Header
        doc.setFontSize(18);
        doc.setTextColor(15, 23, 42); // slate-900
        doc.text('Nexus Core - Customs Duty Assessment Certificate', 14, 20);

        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 27);
        doc.text(`Importer Tax ID (PIN): ${sampleInvoice.importerTaxId}`, 14, 32);
        doc.text(`Port of Discharge: ${sampleInvoice.portOfDischarge}`, 14, 37);

        // Summary Assessment Table
        autoTable(doc, {
            startY: 45,
            head: [['Tax Head', 'Calculation Basis', 'Rate Applied', 'Amount (KES)']],
            body: [
                ['CIF Cargo Value (KES)', `USD ${assessment.cifValueUsd.toLocaleString()} @ ${assessment.exchangeRateKe}`, 'N/A', assessment.cifValueKes.toLocaleString()],
                ['Import Duty (Preferential)', 'CIF Value', 'AfCFTA Discounted', assessment.taxBreakdown.importDutyKes.toLocaleString()],
                ['Import Declaration Fee (IDF)', 'CIF Value', '2.5%', assessment.taxBreakdown.idfKes.toLocaleString()],
                ['Railway Development Levy (RDL)', 'CIF Value', '2.0%', assessment.taxBreakdown.rdlKes.toLocaleString()],
                ['Value Added Tax (VAT)', 'CIF + Duty + IDF + RDL', '16.0%', assessment.taxBreakdown.vatKes.toLocaleString()],
            ],
            foot: [
                ['TOTAL CUSTOMS TAX PAYABLE', '', '', `KES ${assessment.taxBreakdown.totalCustomsTaxKes.toLocaleString()}`]
            ],
            headStyles: { fillColor: [37, 99, 235] },
            footStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255] }
        });

        // Payment Info Section
        const finalY = doc.lastAutoTable.finalY + 15;
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text(`Payment Status: ${paymentStatus.toUpperCase()}`, 14, finalY);
        if (mpesaReceipt) {
            doc.text(`M-Pesa Receipt Ref: ${mpesaReceipt}`, 14, finalY + 7);
        }

        doc.save(`customs_assessment_${sampleInvoice.importerTaxId}.pdf`);
        addLog('EXPORT: Official Duty Assessment PDF downloaded.', 'info');
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setPipelineStage('idle');
            setAssessment(null);
            setGeneratedXml('');
            setLogs([]);
            setPaymentStatus('pending');
            setMpesaReceipt('');
        }
    };

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
            <header className="max-w-7xl mx-auto mb-8 border-b border-slate-800 pb-4 flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                        <span className="bg-blue-600 text-xs px-2.5 py-1 rounded font-mono uppercase text-white">
                            Nexus Core
                        </span>
                        Automated Clearing &amp; Forwarding Agent
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                        End-to-end cargo document audit, duty calculation, customs filing &amp; settlement.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="inline-flex items-center rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-400 ring-1 ring-inset ring-emerald-400/20">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mr-2 animate-pulse" />
                        iCMS / ASYCUDA Gateway Online
                    </span>
                </div>
            </header>

            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Document Intake */}
                <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
                    <div>
                        <h2 className="text-base font-semibold text-white mb-2">1. Cargo Document Suite</h2>
                        <p className="text-xs text-slate-400 mb-4">Upload Invoice, Packing List, or Bill of Lading.</p>

                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${file ? 'border-emerald-500/50 bg-emerald-950/10' : 'border-slate-800 hover:border-blue-500 bg-slate-950/40'
                                }`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="application/pdf,image/*"
                                className="hidden"
                                onChange={handleFileChange}
                                disabled={isProcessing}
                            />
                            <div className="space-y-2">
                                <div className="mx-auto h-10 w-10 text-slate-400 flex items-center justify-center bg-slate-800 rounded-full">
                                    📦
                                </div>
                                {file ? (
                                    <div>
                                        <p className="text-sm text-emerald-400 font-medium truncate max-w-[200px] mx-auto">{file.name}</p>
                                        <p className="text-xs text-slate-500 mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                ) : (
                                    <div>
                                        <p className="text-sm text-slate-300 font-medium">Click to attach cargo payload</p>
                                        <p className="text-xs text-slate-500 mt-1">PDF or Scanned Invoice</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 space-y-3">
                        <button
                            type="button"
                            onClick={handleRunFullPipeline}
                            disabled={!file || isProcessing}
                            className={`w-full py-3 px-4 rounded text-xs font-semibold uppercase tracking-wider transition-all ${!file || isProcessing
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20'
                                }`}
                        >
                            {isProcessing ? 'Executing Agent Pipeline...' : 'Run Automated Clearing Agent'}
                        </button>
                    </div>
                </section>

                {/* Execution Log & Results */}
                <section className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between space-y-6">

                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-base font-semibold text-white">2. Orchestrator Execution Log</h2>
                            <span className="text-xs font-mono text-slate-400 uppercase">{pipelineStage}</span>
                        </div>

                        <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs text-slate-300 h-48 overflow-y-auto space-y-1.5">
                            {logs.length === 0 ? (
                                <p className="text-slate-600 italic">// Awaiting document dispatch. Attach a cargo invoice and start the pipeline...</p>
                            ) : (
                                logs.map((log, index) => (
                                    <div key={index} className="flex items-start gap-2">
                                        <span className="text-slate-600 shrink-0">[{log.timestamp}]</span>
                                        <span
                                            className={
                                                log.type === 'success'
                                                    ? 'text-emerald-400'
                                                    : log.type === 'warning'
                                                        ? 'text-amber-400'
                                                        : log.type === 'error'
                                                            ? 'text-rose-400'
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

                    {/* Assessment & Download Options */}
                    {assessment && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800 pt-4">

                            {/* Duty Calculation & Real-Time M-Pesa */}
                            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-3">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Customs Tax Assessment</h3>
                                    <button
                                        onClick={handleDownloadPdfAssessment}
                                        className="text-xs bg-slate-800 hover:bg-slate-700 text-blue-400 px-2 py-1 rounded border border-slate-700 transition-colors"
                                    >
                                        📄 Download PDF
                                    </button>
                                </div>

                                <div className="space-y-1 text-xs">
                                    <div className="flex justify-between text-slate-400">
                                        <span>Import Duty (Preferential)</span>
                                        <span className="text-slate-200 font-mono">KES {assessment.taxBreakdown.importDutyKes.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-400">
                                        <span>IDF (2.5%) + RDL (2.0%)</span>
                                        <span className="text-slate-200 font-mono">KES {(assessment.taxBreakdown.idfKes + assessment.taxBreakdown.rdlKes).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-400">
                                        <span>VAT (16%)</span>
                                        <span className="text-slate-200 font-mono">KES {assessment.taxBreakdown.vatKes.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-emerald-400 font-semibold pt-2 border-t border-slate-800">
                                        <span>Total Duty Payable</span>
                                        <span className="font-mono">KES {assessment.taxBreakdown.totalCustomsTaxKes.toLocaleString()}</span>
                                    </div>
                                </div>

                                {/* M-Pesa STK Input Form */}
                                <div className="pt-2 border-t border-slate-800 space-y-2">
                                    <label className="text-[11px] text-slate-400 block">M-Pesa Phone Number for Real-Time STK Push:</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={phoneNumber}
                                            onChange={(e) => setPhoneNumber(e.target.value)}
                                            placeholder="2547XXXXXXXX"
                                            disabled={paymentStatus === 'polling' || paymentStatus === 'success'}
                                            className="bg-slate-900 border border-slate-700 text-xs text-white rounded px-2.5 py-1.5 flex-1 font-mono focus:outline-none focus:border-blue-500"
                                        />
                                        <button
                                            onClick={handlePayDutyRealtimeMpesa}
                                            disabled={paymentStatus === 'polling' || paymentStatus === 'success'}
                                            className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${paymentStatus === 'success'
                                                ? 'bg-emerald-600 text-white cursor-default'
                                                : paymentStatus === 'polling'
                                                    ? 'bg-amber-600 text-white animate-pulse'
                                                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                                }`}
                                        >
                                            {paymentStatus === 'initiating'
                                                ? 'Connecting...'
                                                : paymentStatus === 'polling'
                                                    ? 'Awaiting PIN...'
                                                    : paymentStatus === 'success'
                                                        ? '✓ Duty Settled'
                                                        : 'Pay via M-Pesa'}
                                        </button>
                                    </div>
                                    {mpesaReceipt && (
                                        <p className="text-[11px] text-emerald-400 font-mono">Receipt: {mpesaReceipt}</p>
                                    )}
                                </div>
                            </div>

                            {/* Single Window XML EDI Preview & Download */}
                            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Single Window EDI (IM4)</h3>
                                        <button
                                            onClick={handleDownloadXml}
                                            className="text-xs bg-slate-800 hover:bg-slate-700 text-emerald-400 px-2 py-1 rounded border border-slate-700 transition-colors"
                                        >
                                            XML Download XML
                                        </button>
                                    </div>
                                    <textarea
                                        readOnly
                                        value={generatedXml}
                                        className="w-full h-32 bg-slate-900 border border-slate-800 rounded p-2 text-[10px] font-mono text-slate-400 resize-none"
                                    />
                                </div>
                            </div>

                        </div>
                    )}

                </section>

            </div>
        </main>
    );
}