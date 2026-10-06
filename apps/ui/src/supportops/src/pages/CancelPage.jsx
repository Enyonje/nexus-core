// supportops/src/pages/CancelPage.jsx  Stripe returns here if the customer backs out of checkout.
import React from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "../config/paths";

export default function CancelPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617] px-6 text-center">
      <div className="max-w-md">
        <h1 className="text-2xl font-bold text-white">Checkout cancelled</h1>
        <p className="mt-2 text-sm text-slate-400">No payment was taken. You can pick a plan whenever you're ready, and the 14-day free trial is still available.</p>
        <Link to={ROUTES.pricing} className="inline-block mt-5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-semibold text-white">Back to plans</Link>
      </div>
    </div>
  );
}