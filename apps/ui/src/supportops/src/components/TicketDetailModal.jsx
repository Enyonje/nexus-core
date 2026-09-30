import React, { useState, useEffect } from "react";
import api from "../lib/api";
import RCAInsightPanel from "./RCAInsightPanel";

export default function TicketDetailModal({ ticket, onClose }) {
  const [rca, setRca] = useState(null);

  useEffect(() => {
    if (!ticket) return;
    api.post(`/rca/${ticket.id}`).then(res => setRca(res.data));
  }, [ticket]);

  if (!ticket) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-50">
      <div className="bg-slate-900 w-full max-w-3xl rounded-3xl p-6 space-y-6">
        <h2 className="text-xl font-black text-white">
          Ticket {ticket.id}
        </h2>

        <p className="text-slate-400 italic">"{ticket.summary}"</p>

        <RCAInsightPanel report={rca} />

        <button
          onClick={onClose}
          className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-xl font-bold"
        >
          Close
        </button>
      </div>
    </div>
  );
}
