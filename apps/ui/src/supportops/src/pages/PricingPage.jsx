import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API_ENDPOINTS } from "../config/paths";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../../../lib/api";

function formatPrice(cents, currency = "usd") {
  if (cents == null) return "Custom";

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: String(currency).toUpperCase(),
    maximumFractionDigits: 0,
  }).format(Number(cents) / 100);
}

function normalizeFeatures(features) {
  if (Array.isArray(features)) {
    return features.filter((item) => typeof item === "string");
  }

  if (features && typeof features === "object") {
    return Object.entries(features)
      .map(([key, value]) =>
        typeof value === "boolean"
          ? value ? key.replace(/_/g, " ") : null
          : `${key.replace(/_/g, " ")}: ${value}`
      )
      .filter(Boolean);
  }

  return [];
}

export default function PricingPage() {
  const { user, token, loading: authLoading, refreshUser } = useAuth();

  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [working, setWorking] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadPlans() {
      try {
        const response = await fetch(
          API_ENDPOINTS.billing.plans("supportops"),
          {
            headers: { Accept: "application/json" },
            signal: controller.signal,
          }
        );

        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.message || "Unable to load pricing.");
        }

        const app = Array.isArray(payload)
          ? payload.find((item) => item.app === "supportops")
          : null;

        if (!Array.isArray(app?.plans) || !app.plans.length) {
          throw new Error("No active SupportOps plans are configured.");
        }

        setTiers(app.plans.map((plan) => ({
          id: plan.key,
          name: plan.name,
          price: formatPrice(plan.priceCents, plan.currency || "usd"),
          interval: "month",
          features: normalizeFeatures(plan.features),
          isEnterprise: plan.key === "enterprise" || plan.priceCents == null,
          hasTrial: plan.key === "growth",
        })));
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Unable to load SupportOps pricing.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadPlans();
    return () => controller.abort();
  }, []);

  async function handleAction(tier, actionType) {
    setActionError("");

    if (tier.isEnterprise) {
      window.location.assign("/contact?ref=enterprise_supportops");
      return;
    }

    const type = actionType === "trial" ? "trial" : "checkout";
    const plan = type === "trial" ? "growth" : tier.id;

    // New customers use the existing guest onboarding flow.
    if (!user?.id || !token || authLoading) {
      window.location.assign(
        `/supportops/onboarding?plan=${encodeURIComponent(plan)}&type=${type}`
      );
      return;
    }

    setWorking(true);

    try {
      const endpoint = type === "trial"
        ? "/api/supportops/billing/trial"
        : "/api/supportops/billing/checkout";

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          "X-App-Slug": "supportops",
          ...(localStorage.getItem("activeOrgId")
            ? { "X-Org-Id": localStorage.getItem("activeOrgId") }
            : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          app: "supportops",
          plan,
          addons: [],
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (data.error === "ALREADY_SUBSCRIBED") {
          await refreshUser(token);
          window.location.assign("/supportops/admin/executive");
          return;
        }

        throw new Error(
          data.message ||
          data.error ||
          `Request failed (${response.status}).`
        );
      }

      if (type === "trial") {
        await refreshUser(token);
        window.location.assign("/supportops/admin/executive");
        return;
      }

      if (data.url) {
        window.location.assign(data.url);
        return;
      }

      throw new Error("Checkout did not return a payment URL.");
    } catch (err) {
      setActionError(err.message || "Unable to process your request.");
    } finally {
      setWorking(false);
    }
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center text-slate-400">
        Loading SupportOps plans…
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-4 text-red-400">
        <p role="alert">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-slate-800 px-4 py-2 text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-8">
      <div className="flex justify-end">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-4 py-2 text-sm text-slate-400">
          {user?.id ? (
            <span>Signed in as {user.email}</span>
          ) : (
            <>
              <span>Already have an account?</span>
              <Link
                to="/supportops/login"
                className="font-semibold text-cyan-400 hover:text-cyan-300"
              >
                Sign in →
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="space-y-3 text-center">
        <h1 className="text-4xl font-bold text-white">
          SupportOps Plans &amp; Pricing
        </h1>
        <p className="mx-auto max-w-2xl text-slate-400">
          AI-assisted customer support workflows. Compare plans or start a trial.
        </p>
      </div>

      {actionError && (
        <div
          role="alert"
          className="mx-auto max-w-2xl rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-center text-red-300"
        >
          {actionError}
        </div>
      )}

      {working && (
        <p className="text-center text-cyan-400">
          Processing your request…
        </p>
      )}

      <div className="grid items-stretch gap-8 md:grid-cols-3">
        {tiers.map((tier) => (
          <div
            key={tier.id}
            className={`flex flex-col justify-between space-y-6 rounded-2xl border bg-slate-900 p-8 ${
              tier.hasTrial
                ? "border-cyan-500/50 shadow-lg shadow-cyan-500/10"
                : "border-slate-800"
            }`}
          >
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-white">{tier.name}</h3>
                <div className="mt-4 flex items-baseline text-white">
                  <span className="text-4xl font-extrabold tracking-tight">
                    {tier.price}
                  </span>
                  {tier.price !== "Custom" && (
                    <span className="ml-1 text-sm text-slate-400">
                      /{tier.interval}
                    </span>
                  )}
                </div>
              </div>

              {!!tier.features.length && (
                <ul className="space-y-3 text-sm text-slate-300">
                  {tier.features.map((feature, index) => (
                    <li
                      key={`${tier.id}-${index}`}
                      className="flex items-start"
                    >
                      <span className="mr-2 text-cyan-400">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-3 border-t border-slate-800/80 pt-6">
              {tier.hasTrial && (
                <button
                  disabled={working}
                  onClick={() => handleAction(tier, "trial")}
                  className="w-full rounded-xl border border-cyan-500/30 bg-slate-800 px-4 py-3 font-semibold text-cyan-400 hover:bg-slate-700 disabled:opacity-50"
                >
                  Start 14-day trial
                </button>
              )}

              <button
                disabled={working}
                onClick={() => handleAction(tier, "subscribe")}
                className="w-full rounded-xl bg-cyan-600 px-4 py-3 font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
              >
                {tier.isEnterprise
                  ? "Contact sales"
                  : "Subscribe"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
