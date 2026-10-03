import { useEffect, useState } from "react";

export default function AIReviewInbox() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    fetch("/api/ai/pending")
      .then((r) => r.json())
      .then(setItems)
      .catch((err) => console.error("Failed to load pending reviews", err));
  }, []);

  async function review(id, decision) {
    try {
      await fetch(`/api/ai/review/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      setItems((prev) => prev.filter((i) => i._id !== id));
    } catch (err) {
      console.error("Review failed", err);
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          AI Approval Queue
        </h1>
      </div>

      {/* Items */}
      {items.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-gray-400">
          No pending AI replies to review.
        </div>
      ) : (
        <div className="space-y-6">
          {items.map((item) => (
            <div
              key={item._id}
              className="rounded-xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition"
            >
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Confidence: {Math.round(item.confidence * 100)}%
              </p>

              <p className="mt-4 text-slate-200 leading-relaxed">
                {item.aiReply}
              </p>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => review(item._id, "approved")}
                  className="px-4 py-2 rounded-md bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition"
                >
                  Approve
                </button>
                <button
                  onClick={() => review(item._id, "rejected")}
                  className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}