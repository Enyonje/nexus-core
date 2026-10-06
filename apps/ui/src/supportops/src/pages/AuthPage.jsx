// src/pages/AuthPage.jsx
import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
    ShieldCheck,
    Bot,
    Zap,
    ArrowRight,
    CheckCircle2,
    Eye,
    EyeOff,
    Lock,
    Mail,
    User,
    Building2,
    Sparkles
} from "lucide-react";
import { ROUTES } from "../config/paths";

export default function AuthPage() {
    const navigate = useNavigate();
    const location = useLocation();

    // Read plan query parameter passed from Pricing page (e.g., /login?plan=pro)
    const queryParams = new URLSearchParams(location.search);
    const selectedPlan = queryParams.get("plan");

    const [isSignUp, setIsSignUp] = useState(Boolean(selectedPlan)); // Default to Sign Up if a plan was selected
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        fullName: "",
        workEmail: "",
        companyName: "",
        password: "",
        rememberMe: false,
    });

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setLoading(true);

        // Simulate Auth API call / integration
        setTimeout(() => {
            setLoading(false);
            // Route directly to SuccessPage upon successful auth/registration
            navigate(ROUTES.success || "/success", { replace: true, state: { plan: selectedPlan } });
        }, 1200);
    };

    return (
        <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-between font-sans selection:bg-indigo-500 selection:text-white">
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
                    {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                    <span className="text-indigo-400 hover:underline font-semibold ml-1">
                        {isSignUp ? "Sign In" : "Sign Up"}
                    </span>
                </button>
            </header>

            {/* Main Grid */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6 grid lg:grid-cols-12 gap-12 items-center">
                {/* Left Value Column */}
                <div className="hidden lg:flex lg:col-span-6 flex-col justify-center space-y-8 pr-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold tracking-wide w-fit">
                        <Sparkles className="w-3.5 h-3.5" /> Autonomous Customer Support Engine
                    </div>

                    <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight text-white leading-[1.15]">
                        Scale your support <br />
                        <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                            without scaling headcount.
                        </span>
                    </h1>

                    <p className="text-slate-400 text-lg leading-relaxed max-w-lg">
                        Resolve 70% of inbound support tickets automatically with multi-modal AI agents, real-time ticket routing, and instant knowledge base sync.
                    </p>

                    {/* Social Proof Stats */}
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-800/80">
                        <div>
                            <p className="text-2xl font-bold text-white">14.2m</p>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">Avg Response Time</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">99.4%</p>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">CSAT Satisfaction</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">10x</p>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">Resolution Velocity</p>
                        </div>
                    </div>

                    {/* Customer Highlight */}
                    <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/60 backdrop-blur-md flex items-start gap-4">
                        <div className="flex-1">
                            <p className="text-sm text-slate-300 italic">
                                "SupportOps cleared 80% of our tier-1 backlog in less than two weeks. It completely transformed our agent workflows."
                            </p>
                            <p className="text-xs text-slate-500 font-medium mt-2">
                                — Alex Rivera, Head of Ops at NextFlow
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right Form Card */}
                <div className="lg:col-span-6 w-full max-w-md mx-auto">
                    <div className="bg-slate-900/80 border border-slate-800/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl shadow-indigo-950/20">
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-white tracking-tight">
                                {isSignUp ? "Get started with SupportOps" : "Welcome back"}
                            </h2>
                            <p className="text-slate-400 text-sm mt-1">
                                {selectedPlan && isSignUp ? (
                                    <span className="text-indigo-400 font-medium">Selected Plan: {selectedPlan.toUpperCase()} — 14-day free trial</span>
                                ) : isSignUp ? (
                                    "Start your 14-day free trial. No credit card required."
                                ) : (
                                    "Enter your credentials to access your support dashboard."
                                )}
                            </p>
                        </div>

                        {/* OAuth Buttons */}
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <button
                                type="button"
                                onClick={handleSubmit}
                                className="flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-xl text-sm font-medium text-slate-200 transition-all duration-150"
                            >
                                <svg className="w-4 h-4" viewBox="0 0 24 24">
                                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                                </svg>
                                Google
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                className="flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-xl text-sm font-medium text-slate-200 transition-all duration-150"
                            >
                                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                                </svg>
                                GitHub
                            </button>
                        </div>

                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-800"></div>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-slate-900 px-3 text-slate-500 font-medium">Or continue with</span>
                            </div>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {isSignUp && (
                                <>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                                            Full Name
                                        </label>
                                        <div className="relative">
                                            <User className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                            <input
                                                type="text"
                                                name="fullName"
                                                value={formData.fullName}
                                                onChange={handleInputChange}
                                                required={isSignUp}
                                                placeholder="Sarah Connor"
                                                className="w-full bg-slate-950/60 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-2.5 pl-11 pr-4 text-sm text-slate-100 placeholder:text-slate-600 transition-all outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                                            Company Name
                                        </label>
                                        <div className="relative">
                                            <Building2 className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                            <input
                                                type="text"
                                                name="companyName"
                                                value={formData.companyName}
                                                onChange={handleInputChange}
                                                required={isSignUp}
                                                placeholder="Cyberdyne Systems"
                                                className="w-full bg-slate-950/60 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-2.5 pl-11 pr-4 text-sm text-slate-100 placeholder:text-slate-600 transition-all outline-none"
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
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
                                        placeholder="sarah@company.com"
                                        className="w-full bg-slate-950/60 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-2.5 pl-11 pr-4 text-sm text-slate-100 placeholder:text-slate-600 transition-all outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                                        Password
                                    </label>
                                    {!isSignUp && (
                                        <a href="#forgot" className="text-xs text-indigo-400 hover:underline">
                                            Forgot?
                                        </a>
                                    )}
                                </div>
                                <div className="relative">
                                    <Lock className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        required
                                        placeholder="••••••••••••"
                                        className="w-full bg-slate-950/60 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-2.5 pl-11 pr-11 text-sm text-slate-100 placeholder:text-slate-600 transition-all outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            {!isSignUp ? (
                                <div className="flex items-center gap-2 pt-1">
                                    <input
                                        type="checkbox"
                                        id="rememberMe"
                                        name="rememberMe"
                                        checked={formData.rememberMe}
                                        onChange={handleInputChange}
                                        className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-indigo-500 focus:ring-indigo-500/20"
                                    />
                                    <label htmlFor="rememberMe" className="text-xs text-slate-400 font-medium select-none">
                                        Remember me for 30 days
                                    </label>
                                </div>
                            ) : (
                                <p className="text-xs text-slate-500 leading-normal pt-1">
                                    By signing up, you agree to our{" "}
                                    <a href="#" className="text-slate-400 hover:underline">Terms of Service</a>{" "}
                                    and{" "}
                                    <a href="#" className="text-slate-400 hover:underline">Privacy Policy</a>.
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full mt-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-600/25 transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <span>{isSignUp ? "Create Workspace" : "Sign In to Dashboard"}</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </main>

            {/* Minimal Footer */}
            <footer className="w-full max-w-7xl mx-auto px-6 py-6 text-center text-xs text-slate-600">
                &copy; {new Date().getFullYear()} SupportOps Inc. All rights reserved. Encrypted with 256-bit AES.
            </footer>
        </div>
    );
}