import React from "react";
import { useNavigate } from "react-router-dom";
import { XCircle, ArrowLeft } from "lucide-react";

const CancelPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-8 bg-white/5 border border-white/10 p-10 rounded-3xl backdrop-blur-xl shadow-lg">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="p-4 bg-red-500/10 rounded-full">
            <XCircle size={56} className="text-red-500" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-tight text-white">
          Checkout Canceled
        </h1>

        {/* Message */}
        <p className="text-slate-400 leading-relaxed">
          No worries! Your account hasn&apos;t been charged. You can continue
          using the dashboard in demo mode or try upgrading again later.
        </p>

        {/* Action button */}
        <button
          onClick={() => navigate("/")}
          className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 py-3 rounded-xl font-semibold text-white transition"
        >
          <ArrowLeft size={18} /> Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default CancelPage;