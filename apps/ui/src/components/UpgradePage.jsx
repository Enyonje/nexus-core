import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  useStripe,
  useElements,
  CardElement,
} from "@stripe/react-stripe-js";
import { apiFetch } from "../lib/api";
import { useToast } from "./ToastContext.jsx";

// Initialize Stripe once with your publishable key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

function SubscriptionForm() {
  const stripe = useStripe();
  const elements = useElements();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);

    try {
      // Step 1: Create a customer + subscription on backend
      // You’ll need to pass the logged‑in user’s ID or email so backend can create a Stripe customer
      const res = await apiFetch("/billing/create-subscription", {
        method: "POST",
        body: JSON.stringify({
          priceId: import.meta.env.VITE_STRIPE_PRICE_ID, // your recurring plan price ID
        }),
      });

      if (!res.latest_invoice?.payment_intent?.client_secret) {
        throw new Error("No client secret returned for subscription");
      }

      // Step 2: Confirm card payment for the subscription’s first invoice
      const cardElement = elements.getElement(CardElement);
      const { error, paymentIntent } = await stripe.confirmCardPayment(
        res.latest_invoice.payment_intent.client_secret,
        {
          payment_method: {
            card: cardElement,
          },
        }
      );

      if (error) {
        addToast(error.message, "error");
      } else if (paymentIntent.status === "succeeded") {
        addToast("Subscription started 🎉", "success");
        // TODO: update user subscription status in your backend
      }
    } catch (err) {
      addToast(err.message || "Subscription failed", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 max-w-md mx-auto p-6 bg-white dark:bg-gray-900 rounded-xl shadow"
    >
      <h2 className="text-xl font-bold">Upgrade to Pro</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Enter your card details to start your subscription.
      </p>

      <div className="p-3 border rounded-lg">
        <CardElement options={{ style: { base: { fontSize: "16px" } } }} />
      </div>

      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition disabled:opacity-60"
      >
        {loading ? "Processing…" : "Subscribe"}
      </button>
    </form>
  );
}

export default function UpgradeSubscription() {
  return (
    <Elements stripe={stripePromise}>
      <SubscriptionForm />
    </Elements>
  );
}