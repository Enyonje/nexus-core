// src/pages/AuthPage.jsx
import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
    Bot,
    ArrowRight,
    Eye,
    EyeOff,
    Lock,
    Mail,
    User,
    Building2,
    Sparkles,
    ShieldCheck,
    Briefcase,
    TrendingUp,
    Headphones
} from "lucide-react";
import { ROUTES } from "../config/paths";

const ROLES = [
    {
        id: "admin",
        label: "Admin",
        icon: ShieldCheck,
        desc: "Full system config, workspace billing & plan changes",
        canChangePlan: true,
    },
    {
        id: "management",
        label: "Management",
        icon: Briefcase,
        desc: "Team performance, CSAT & operational analytics",
        canChangePlan: false,
    },
    {
        id: "agent",
        label: "Agent",
        icon: Headphones,
        desc: "Ticket queues, live AI copilot & customer chats",
        canChangePlan: false,
    },
    {
        id: "investor",
        label: "Investor",
        icon: TrendingUp,
        desc: "Read-only financial, throughput & growth metrics",
        canChangePlan: false,
    },
];

export default function AuthPage() {
    const navigate = useNavigate();
    const location = useLocation();

    const queryParams = new URLSearchParams(location.search);
    const selectedPlan = queryParams.get("plan");

    const [isSignUp, setIsSignUp] = useState(Boolean(selectedPlan));
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    // Explicit Role Selection
    const [selectedRole, setSelectedRole] = useState("admin");

    const [formData, setFormData] = useState({
        fullName: "",
        workEmail: "",
        companyName: "",
        password: "",
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setLoading(true);

        const userSession = {
            ...formData,
            role: selectedRole,
            plan: selectedPlan || "starter",
        };
        localStorage.setItem("supportops_user", JSON.stringify(userSession));

        setTimeout(() => {
            setLoading(false);
            navigate(ROUTES.success || "/success", { replace: true, state: { plan: selectedPlan, role: userSession.role } });
        }, 1000);
    };

    return (
        <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-between font-sans">
            {/* Top Header */}
            <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-2 text-indigo-400 font-bold text-xl tracking-tight">
                    <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                        <Bot className="w-6 h-6 text-indigo-400" />
                    </div>
                    <span>SupportOps<span className="text-indigo-500">.ai</span></span>
                </Link>
                <button
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
                >
                    {isSignUp ? "Already registered?" : "Need to setup a workspace?"}{" "}
                    <span className="text-indigo-400 hover:underline font-semibold ml-1">
                        {isSignUp ? "Sign In" : "Sign Up"}
                    </span>
                </button>
            </header>

            {/* Main Content Grid */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6 grid lg:grid-cols-12 gap-12 items-center">
                {/* Informational Column */}
                <div className="hidden lg:flex lg:col-span-6 flex-col justify-center space-y-8 pr-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold tracking-wide w-fit">
                        <Sparkles className="w-3.5 h-3.5" /> Role-Based Access Control (RBAC)
                    </div>

                    <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight text-white leading-[1.15]">
                        Tailored views for <br />
                        <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                            Admins, Agents & Leadership.
                        </span>
                    </h1>

                    <div className="space-y-4 text-slate-400 text-base">
                        <div className="flex items-start gap-3">
                            <ShieldCheck className="w-5 h-5 text-indigo-400 mt-1 shrink-0" />
                            <p><strong className="text-slate-200">Admin:</strong> Authority over plan subscriptions, integrations, and workspace configuration.</p>
                        </div>
                        <div className="flex items-start gap-3">
                            <Briefcase className="w-5 h-5 text-indigo-400 mt-1 shrink-0" />
                            <p><strong className="text-slate-200">Management:</strong> Operations monitoring, agent workload distribution, and team SLA tracking.</p>
                        </div>
                        <div className="flex items-start gap-3">
                            <Headphones className="w-5 h-5 text-indigo-400 mt-1 shrink-0" />
                            <p><strong className="text-slate-200">Agent:</strong> Execution view for managing ticket queues and reviewing AI response drafts.</p>
                        </div>
                        <div className="flex items-start gap-3">
                            <TrendingUp className="w-5 h-5 text-indigo-400 mt-1 shrink-0" />
                            <p><strong className="text-slate-200">Investor:</strong> Executive access to ARR, resolution velocity, and overall platform growth metrics.</p>
                        </div>
                    </div>
                </div>

                {/* Auth Card */}
                <div className="lg:col-span-6 w-full max-w-md mx-auto">
                    <div className="bg-slate-900/80 border border-slate-800/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl shadow-indigo-950/20">
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-white tracking-tight">
                                {isSignUp ? "Register Account" : "Workspace Portal Login"}
                            </h2>
                            <p className="text-slate-400 text-sm mt-1">
                                Select your assigned role to access your dedicated workspace.
                            </p>
                        </div>

                        {/* 4-Role Grid Selector */}
                        <div className="mb-6">
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                Select Role Persona
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {ROLES.map((role) => {
                                    const Icon = role.icon;
                                    const isSelected = selectedRole === role.id;
                                    return (
                                        <button
                                            key={role.id}
                                            type="button"
                                            onClick={() => setSelectedRole(role.id)}
                                            className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${isSelected
                                                ? "bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-500/10"
                                                : "bg-slate-950/50 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                                                }`}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <Icon className={`w-4 h-4 ${isSelected ? "text-indigo-400" : "text-slate-500"}`} />
                                                <span className="text-xs font-bold">{role.label}</span>
                                            </div>
                                            <span className="text-[10px] text-slate-500 leading-tight">{role.desc}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {isSignUp && (
                                <>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                                            Full Name
                                        </label>
                                        <div className="relative">
                                            <User className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                            <input
                                                type="text"
                                                name="fullName"
                                                value={formData.fullName}
                                                onChange={handleInputChange}
                                                required
                                                placeholder="Alex Rivera"
                                                className="w-full bg-slate-950/60 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 pl-11 pr-4 text-sm text-slate-100 outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                                            Organization Name
                                        </label>
                                        <div className="relative">
                                            <Building2 className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                            <input
                                                type="text"
                                                name="companyName"
                                                value={formData.companyName}
                                                onChange={handleInputChange}
                                                required
                                                placeholder="Acme Corp"
                                                className="w-full bg-slate-950/60 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 pl-11 pr-4 text-sm text-slate-100 outline-none"
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                                    Work Email
                                </label>
                                <div className="relative">
                                    <Mail className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="email"
                                        name="workEmail"
                                        value={formData.workEmail}
                                        onChange={handleInputChange}
                                        required
                                        placeholder="user@company.com"
                                        className="w-full bg-slate-950/60 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 pl-11 pr-4 text-sm text-slate-100 outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                                    Password
                                </label>
                                <div className="relative">
                                    <Lock className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        required
                                        placeholder="••••••••••••"
                                        className="w-full bg-slate-950/60 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 pl-11 pr-11 text-sm text-slate-100 outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full mt-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <span>
                                            {isSignUp
                                                ? `Continue as ${selectedRole.toUpperCase()}`
                                                : `Sign In as ${selectedRole.toUpperCase()}`}
                                        </span>
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
}