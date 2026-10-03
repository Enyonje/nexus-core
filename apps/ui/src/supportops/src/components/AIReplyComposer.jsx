import React, { useState } from "react";
import { Sparkles, RotateCcw, Send } from "lucide-react";
import toast from "react-hot-toast";

export default function AIReplyComposer({ ticket }) {
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState("");

  const generateReply = async () => {
    setLoading(true);
    setReply("");

    // Simulated AI generation (replace with FastAPI later)
    setTimeout(() => {
      setReply(
        `Hi ${ticket.customer || "there"},\n\nThanks for reaching out regarding "${ticket.subject}". Our AI system has identified the issue and is actively working on a resolution.\n\nWe’ll update you shortly.\n\n— SupportOps AI`
      );
      setLoading(false);
    }, 1200);
  };

  const sendReply = () => {
    toast.success("Reply sent to customer");
    setReply("");
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-bold flex items-center gap-2">
          <Sparkles className="text-blue-500" />
          AI Reply Composer
        </h4>

        <button
          onClick={generateReply}
          className="text-xs flex items-center gap-1 text-blue-400 hover:text-blue-300"
        >
          <RotateCcw size={14} />
          Regenerate
        </button>
      </div>

      <textarea
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        placeholder={
          loading
            ? "AI is drafting a response…"
            : "Generate an AI reply to get started"
        }
        className="w-full h-40 bg-slate-900 border border-white/10 rounded-xl p-4 text-sm text-slate-200 outline-none focus:border-blue-500"
        disabled={loading}
      />

      <div className="flex justify-end">
        <button
          onClick={sendReply}
          disabled={!reply}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 px-6 py-3 rounded-xl font-bold flex items-center gap-2"
        >
          <Send size={16} />
          Send Reply
        </button>
      </div>
    </div>
  );
}
