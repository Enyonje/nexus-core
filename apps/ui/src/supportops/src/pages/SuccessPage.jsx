// supportops/src/pages/SuccessPage.jsx
// Stripe returns here after checkout, or users are directed here after login/registration.
// The plan arrives through a webhook a few seconds later, so we wait for it, then open the dashboard.
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, RefreshCw } from "lucide-react";
import { useApp } from "../../../context/AccessProvider";
import { useAuth } from "../context/AuthContext";
import { ROUTES, homeForRole } from "../config/paths";

const MAX_TRIES = 10; // about 20 seconds

export default function SuccessPage() {
  const navigate = useNavigate();
  const { isAuth, role } = useAuth();
  const app = useApp("supportops");
  const [tries, setTries] = useState(0);

  useEffect(() => {
    if (!isAuth) return undefined;

    // Direct user to role dashboard once subscription is confirmed
    if (app.subscribed) {
      const targetRole = app.role || role;
      const t = setTimeout(() => navigate(homeForRole(targetRole), { replace: true }), 1200);
      return () => clearTimeout(t);
    }

    if (tries >= MAX_TRIES) return undefined;

    // Poll for subscription status update
    const t = setTimeout(async () => {
      await app.refresh();
      setTries((n) => n + 1);
    }, 2000);

    return () => clearTimeout(t);
  }, [isAuth, app.subscribed, app.role, role, tries]); // eslint-disable-line react-hooks/exhaustive-deps

  const waiting = isAuth && !app.subscribed && tries < MAX_TRIES;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617] px-6 text-center">
      <div className="max-w-md">
        {app.subscribed ? (
          <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-emerald-400" />
        ) : (
          <RefreshCw className={`h-10 w-10 mx-auto mb-4 text-cyan-400 ${waiting ? "animate-spin" : ""}`} />
        )}
        <h1 className="text-2xl font-bold text-white">
          {app.subscribed
            ? "You're all set"
            : !isAuth
              ? "You're signed out"
              : waiting
                ? "Confirming your subscription…"
                : "Still confirming"}
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          {app.subscribed
            ? "Opening your dashboard…"
            : !isAuth
              ? "Log in to continue to SupportOps."
              : waiting
                ? "This takes a few seconds while we sync your plan."
                : "Your request was processed, but your plan is taking longer than usual to appear. It will show up shortly."}
        </p>

        {!isAuth && (
          <Link
            to={ROUTES.login}
            className="inline-block mt-5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-semibold text-white transition-colors"
          >
            Log in
          </Link>
        )}

        {isAuth && !waiting && !app.subscribed && (
          <div className="mt-5 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => setTries(0)}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-semibold text-white transition-colors"
            >
              Check again
            </button>
            <Link
              to={ROUTES.pricing}
              className="px-4 py-2 rounded-lg border border-slate-700 text-sm text-slate-200 hover:bg-white/5 transition-colors"
            >
              Back to plans
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}