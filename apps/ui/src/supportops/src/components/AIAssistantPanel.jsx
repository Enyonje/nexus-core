import React, { useState } from "react";
import { Bot, Sparkles } from "lucide-react";
import toast from "react-hot-toast";

const API_BASE_URL = "https://supportops-ai.onrender.com";

export default function AIAssistantPanel({ ticket }) {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(ticket.ai_reply);

  const runAI = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/tickets/${ticket.id}/ai-run`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
        }
      );

      const data = await res.json();
      setResponse(data.reply);
      toast.success("AI response generated");
    } catch {
      toast.error("AI failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Bot size={16} className="text-blue-400" />
        <span className="text-xs font-black uppercase text-blue-400">
          AI Assistant
        </span>
      </div>

      <p className="text-sm text-slate-200 mb-3">
        {response || "No AI response yet"}
      </p>

      <button
        onClick={runAI}
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-500 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
      >
        <Sparkles size={14} />
        {loading ? "Thinking…" : "Run AI"}
      </button>
    </div>
  );
}
