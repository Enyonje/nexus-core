import RevenueChart from "../components/RevenueChart";
import AIImpact from "../components/AIImpact";

import {
    Sparkles,
    Ticket,
    DollarSign,
    Users,
} from "lucide-react";

/**
 * Demo SaaS metrics
 */
const demoMetrics = {
    mrr: 2480,
    mrrChange: "+12.4%",
    customers: 31,
    customersChange: "+3",
    tickets: 1284,
    ticketsChange: "+18%",
    aiResolutionRate: 67,
};

export default function Dashboard() {
    const stats = [
        {
            label: "Monthly Recurring Revenue",
            value: `$${demoMetrics.mrr.toLocaleString()}`,
            change: demoMetrics.mrrChange,
            icon: DollarSign,
            color: "text-emerald-400",
        },
        {
            label: "Active Customers",
            value: demoMetrics.customers,
            change: demoMetrics.customersChange,
            icon: Users,
            color: "text-blue-400",
        },
        {
            label: "Tickets (30 days)",
            value: demoMetrics.tickets,
            change: demoMetrics.ticketsChange,
            icon: Ticket,
            color: "text-purple-400",
        },
        {
            label: "AI Resolution Rate",
            value: `${demoMetrics.aiResolutionRate}%`,
            change: "+5%",
            icon: Sparkles,
            color: "text-green-400",
        },
    ];

    return (
        <div className="min-h-screen bg-[#020617] text-slate-100 px-6 py-8">
            {/* Header */}
            <div className="mb-10">
                <h1 className="text-3xl font-bold tracking-tight">
                    SupportOps Dashboard
                </h1>
                <p className="text-slate-400 mt-1">
                    AI-powered support operations overview
                </p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-12">
                {stats.map((stat) => (
                    <div
                        key={stat.label}
                        className="rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-xl"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <stat.icon className={`h-6 w-6 ${stat.color}`} />
                            <span className="text-xs text-emerald-400">
                                {stat.change}
                            </span>
                        </div>

                        <div className="text-3xl font-bold mb-1">
                            {stat.value}
                        </div>
                        <div className="text-sm text-slate-400">
                            {stat.label}
                        </div>
                    </div>
                ))}
            </div>

            {/* Operations */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-12">
                {/* Live Activity */}
                <div className="xl:col-span-2 rounded-2xl bg-white/5 border border-white/10 p-6">
                    <h2 className="text-lg font-semibold mb-4">
                        Live AI Activity
                    </h2>

                    <div className="space-y-4 text-sm text-slate-300">
                        <div className="flex justify-between">
                            <span>Ticket #4921 auto-resolved</span>
                            <span className="text-emerald-400">AI</span>
                        </div>
                        <div className="flex justify-between">
                            <span>New customer onboarded: Acme Ltd</span>
                            <span className="text-blue-400">Growth</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Workflow optimized: Billing Issues</span>
                            <span className="text-purple-400">System</span>
                        </div>
                    </div>
                </div>

                {/* System Status */}
                <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
                    <h2 className="text-lg font-semibold mb-4">
                        System Status
                    </h2>

                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span>AI Engine</span>
                            <span className="text-green-400">Operational</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Workflow Engine</span>
                            <span className="text-green-400">Stable</span>
                        </div>
                        <div className="flex justify-between">
                            <span>API Latency</span>
                            <span className="text-slate-300">118ms</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ✅ ANALYTICS SECTION (THIS WAS MISSING) */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2">
                    <RevenueChart />
                </div>
                <AIImpact />
            </div>
        </div>
    );
}
