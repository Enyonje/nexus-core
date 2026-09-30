import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, Zap, ArrowRight } from "lucide-react";
import confetti from "canvas-confetti";

const SuccessPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Trigger celebration confetti
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#22c55e", "#2563eb", "#ffffff"],
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center text-white">
      <div className="max-w-md w-full text-center space-y-8 bg-white/5 border border-white/10 p-10 rounded-3xl backdrop-blur-xl shadow-lg">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="p-5 bg-slate-800 rounded-full border-2 border-green-500">
            <CheckCircle size={48} className="text-green-500" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
          Upgrade Successful!
        </h1>

        {/* Message */}
        <p className="text-slate-400 leading-relaxed">
          Welcome to{" "}
          <span className="text-blue-400 font-bold">SupportOps Pro</span>. Your
          AI accuracy and ticket orchestration limits have been lifted.
        </p>

        {/* Action button */}
        <button
          onClick={() => navigate("/")}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition"
        >
          Go to Pro Dashboard <ArrowRight size={18} />
        </button>

        {/* Status */}
        <div className="flex items-center justify-center gap-2 opacity-60">
          <Zap size={14} className="text-blue-400 fill-blue-400" />
          <span className="text-xs font-bold uppercase tracking-widest">
            Pro Member Active
          </span>
        </div>
      </div>
    </div>
  );
};

export default SuccessPage;