// supportops/src/pages/AdminRegisterPage.jsx

import React, { useState } from "react";

import {
    Link,
    useNavigate,
} from "react-router-dom";

import {
    ShieldCheck,
    Mail,
    Lock,
    User,
    Eye,
    EyeOff,
    ArrowRight,
    Loader2,
    AlertCircle,
    CheckCircle2,
    Building2,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

export default function AdminRegisterPage() {
    const navigate = useNavigate();

    const auth = useAuth();

    const signUp = auth.signUp || auth.register;

    const [form, setForm] = useState({
        fullName: "",
        email: "",
        password: "",
        confirmPassword: "",
    });

    const [showPassword, setShowPassword] = useState(false);

    const [showConfirmPassword, setShowConfirmPassword] =
        useState(false);

    const [loading, setLoading] = useState(false);

    const [error, setError] = useState("");

    const [success, setSuccess] = useState("");

    const [acceptedTerms, setAcceptedTerms] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;

        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));

        setError("");
    };

    const validateForm = () => {
        if (!form.fullName.trim()) {
            return "Please enter your full name.";
        }

        if (!form.email.trim()) {
            return "Please enter your work email.";
        }

        const emailPattern =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailPattern.test(form.email)) {
            return "Please enter a valid email address.";
        }

        if (form.password.length < 8) {
            return "Your password must contain at least 8 characters.";
        }

        if (form.password !== form.confirmPassword) {
            return "Your passwords do not match.";
        }

        if (!acceptedTerms) {
            return "Please accept the terms and conditions.";
        }

        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        setError("");
        setSuccess("");

        const validationError = validateForm();

        if (validationError) {
            setError(validationError);
            return;
        }

        if (typeof signUp !== "function") {
            setError(
                "Registration is not connected yet. Please configure the registration method in AuthContext."
            );

            return;
        }

        setLoading(true);

        try {
            const result = await signUp(
                form.email.trim(),
                form.password,
                {
                    fullName: form.fullName.trim(),
                }
            );

            if (result?.error) {
                throw result.error;
            }

            setSuccess(
                "Your registration request was submitted successfully. Follow the verification instructions sent to your email."
            );

            setTimeout(() => {
                navigate("/supportops/login", {
                    replace: true,
                    state: {
                        message:
                            "Registration submitted. Please verify your email before signing in.",
                    },
                });
            }, 2500);

        } catch (err) {
            console.error(
                "Admin registration error:",
                err
            );

            setError(
                err?.message ||
                "We couldn't create your account. Please try again."
            );

        } finally {
            setLoading(false);
        }
    };

    const inputClass =
        "w-full rounded-xl border border-slate-700 bg-slate-900/80 py-3 pl-11 pr-12 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/10";

    return (
        <div className="min-h-screen bg-[#070d19] text-white">

            {/* Background */}

            <div className="pointer-events-none fixed inset-0 overflow-hidden">

                <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-cyan-500/10 blur-[120px]" />

                <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-indigo-500/10 blur-[120px]" />

            </div>

            {/* Navigation */}

            <header className="relative z-10 flex items-center justify-between border-b border-slate-800/80 px-6 py-5 lg:px-12">

                <Link
                    to="/supportops"
                    className="flex items-center gap-3"
                >

                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600">

                        <ShieldCheck className="h-6 w-6 text-white" />

                    </div>

                    <div>
                        <h1 className="text-xl font-bold tracking-tight">
                            SupportOps
                        </h1>

                        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                            Intelligent Operations
                        </p>
                    </div>

                </Link>

                <Link
                    to="/supportops/login"
                    className="text-sm font-medium text-slate-300 transition hover:text-cyan-400"
                >
                    Admin Login
                </Link>

            </header>

            {/* Main Content */}

            <main className="relative z-10 flex min-h-[calc(100vh-81px)] items-center justify-center px-5 py-12">

                <div className="w-full max-w-lg">

                    {/* Heading */}

                    <div className="mb-8 text-center">

                        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">

                            <Building2 className="h-8 w-8 text-cyan-400" />

                        </div>

                        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-cyan-400">

                            <ShieldCheck className="h-3.5 w-3.5" />

                            Administrator Registration

                        </div>

                        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                            Create your workspace
                        </h2>

                        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-400">
                            Set up your SupportOps administrator
                            account and take control of your
                            support operations.
                        </p>

                    </div>

                    {/* Registration Card */}

                    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">

                        {/* Error */}

                        {error && (
                            <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">

                                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

                                <p>{error}</p>

                            </div>
                        )}

                        {/* Success */}

                        {success && (
                            <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">

                                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

                                <p>{success}</p>

                            </div>
                        )}

                        <form
                            onSubmit={handleSubmit}
                            className="space-y-5"
                        >

                            {/* Full Name */}

                            <div>

                                <label className="mb-2 block text-sm font-medium text-slate-300">
                                    Full name
                                </label>

                                <div className="relative">

                                    <User className="absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-500" />

                                    <input
                                        type="text"
                                        name="fullName"
                                        value={form.fullName}
                                        onChange={handleChange}
                                        placeholder="Enter your full name"
                                        autoComplete="name"
                                        disabled={loading}
                                        className={inputClass}
                                    />

                                </div>

                            </div>

                            {/* Email */}

                            <div>

                                <label className="mb-2 block text-sm font-medium text-slate-300">
                                    Work email
                                </label>

                                <div className="relative">

                                    <Mail className="absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-500" />

                                    <input
                                        type="email"
                                        name="email"
                                        value={form.email}
                                        onChange={handleChange}
                                        placeholder="admin@company.com"
                                        autoComplete="email"
                                        disabled={loading}
                                        className={inputClass}
                                    />

                                </div>

                            </div>

                            {/* Password */}

                            <div>

                                <label className="mb-2 block text-sm font-medium text-slate-300">
                                    Password
                                </label>

                                <div className="relative">

                                    <Lock className="absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-500" />

                                    <input
                                        type={
                                            showPassword
                                                ? "text"
                                                : "password"
                                        }
                                        name="password"
                                        value={form.password}
                                        onChange={handleChange}
                                        placeholder="Minimum 8 characters"
                                        autoComplete="new-password"
                                        disabled={loading}
                                        className={inputClass}
                                    />

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowPassword(
                                                !showPassword
                                            )
                                        }
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                                        aria-label={
                                            showPassword
                                                ? "Hide password"
                                                : "Show password"
                                        }
                                    >

                                        {showPassword ? (
                                            <EyeOff className="h-5 w-5" />
                                        ) : (
                                            <Eye className="h-5 w-5" />
                                        )}

                                    </button>

                                </div>

                            </div>

                            {/* Confirm Password */}

                            <div>

                                <label className="mb-2 block text-sm font-medium text-slate-300">
                                    Confirm password
                                </label>

                                <div className="relative">

                                    <Lock className="absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-500" />

                                    <input
                                        type={
                                            showConfirmPassword
                                                ? "text"
                                                : "password"
                                        }
                                        name="confirmPassword"
                                        value={form.confirmPassword}
                                        onChange={handleChange}
                                        placeholder="Confirm your password"
                                        autoComplete="new-password"
                                        disabled={loading}
                                        className={inputClass}
                                    />

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowConfirmPassword(
                                                !showConfirmPassword
                                            )
                                        }
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                                        aria-label={
                                            showConfirmPassword
                                                ? "Hide password"
                                                : "Show password"
                                        }
                                    >

                                        {showConfirmPassword ? (
                                            <EyeOff className="h-5 w-5" />
                                        ) : (
                                            <Eye className="h-5 w-5" />
                                        )}

                                    </button>

                                </div>

                            </div>

                            {/* Terms */}

                            <label className="flex cursor-pointer items-start gap-3">

                                <input
                                    type="checkbox"
                                    checked={acceptedTerms}
                                    onChange={(e) =>
                                        setAcceptedTerms(
                                            e.target.checked
                                        )
                                    }
                                    className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
                                />

                                <span className="text-xs leading-5 text-slate-400">
                                    I agree to the SupportOps terms
                                    of service and privacy policy.
                                </span>

                            </label>

                            {/* Submit */}

                            <button
                                type="submit"
                                disabled={loading || Boolean(success)}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-cyan-900/20 transition hover:from-cyan-400 hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                            >

                                {loading ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />

                                        Creating account...
                                    </>
                                ) : (
                                    <>
                                        Create Admin Account

                                        <ArrowRight className="h-4 w-4" />
                                    </>
                                )}

                            </button>

                        </form>

                        {/* Login Link */}

                        <div className="mt-7 border-t border-slate-800 pt-6 text-center">

                            <p className="text-sm text-slate-400">

                                Already have an administrator account?

                                <Link
                                    to="/supportops/login"
                                    className="ml-1 font-semibold text-cyan-400 hover:text-cyan-300"
                                >
                                    Sign in
                                </Link>

                            </p>

                        </div>

                    </div>

                    {/* Footer */}

                    <p className="mt-7 text-center text-xs text-slate-600">
                        © {new Date().getFullYear()} SupportOps.
                        Secure Operational Intelligence.
                    </p>

                </div>

            </main>

        </div>
    );
}
