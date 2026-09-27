"use client";

import React from "react";
import { CrossBorderCompliance } from "../../../components/CrossBorderCompliance";

export default function CompliancePage() {
    return (
        <div className="min-h-screen bg-slate-950 p-8 text-slate-100">
            <div className="max-w-4xl mx-auto mb-6">
                <h1 className="text-2xl font-bold">Nexus Core — International Trade Operations</h1>
                <p className="text-slate-400 text-sm">
                    Run autonomous statutory screening and tariff classification for international trade corridors.
                </p>
            </div>

            <CrossBorderCompliance tenantId="tenant_demo_123" />
        </div>
    );
}