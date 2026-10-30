// src/components/OnboardingBanner.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Circle, Users, ArrowRight, X } from "lucide-react";

export default function OnboardingBanner({ user }) {
    const [dismissed, setDismissed] = useState(false);

    // Check if organization or team details are complete
    const isOrgConfigured = Boolean(user?.organization && user.organization !== "Default");
    const hasInvitedTeam = Boolean(user?.teamMembersCount > 1);

    if (dismissed || (isOrgConfigured && hasInvitedTeam)) {
        return null;
    }

    return (
        <div className="mb-8 rounded-2xl bg-gradient-to-r from-blue-950/60 via-indigo-950/40 to-slate-900 border border-blue-500/30 p-5 relative overflow-hidden backdrop-blur-md shadow-xl">
            <button
                onClick={() => setDismissed(true)}
                className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors"
                aria-label="Dismiss banner"
            >
                <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-400">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        Quick Setup Guide
                    </div>
                    <h3 className="text-base font-bold text-white">
                        Welcome to Nexus Core, {user?.email?.split("@")[0]}! 🎉
                    </h3>
                    <p className="text-xs text-slate-400">
                        Complete your workspace configuration to unlock multi-agent team collaboration.
                    </p>
                </div>

                {/* Progress Checklist Steps */}
                <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
                    <div className="flex items-center gap-1.5 text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Account</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Swarm Ready</span>
                    </div>

                    <div className={`flex items-center gap-1.5 ${isOrgConfigured ? "text-emerald-400" : "text-slate-500"}`}>
                        {isOrgConfigured ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                        <span>Organization</span>
                    </div>

                    <Link
                        to="/admin/team"
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-lg shadow-blue-900/30"
                    >
                        <Users className="w-3.5 h-3.5" /> Invite Team <ArrowRight className="w-3 h-3" />
                    </Link>
                </div>
            </div>
        </div>
    );
}