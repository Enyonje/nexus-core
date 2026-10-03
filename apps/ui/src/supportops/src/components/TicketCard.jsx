export default function TicketCard({ ticket }) {
  return (
    <div className="bg-white/5 p-6 rounded-xl space-y-2">
      <h3 className="font-bold text-lg">{ticket.subject}</h3>
      <p className="text-slate-400 text-sm">{ticket.summary}</p>

      {ticket.ai_suggestion && (
        <div className="mt-4 p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
          <p className="text-xs uppercase text-blue-400">
            AI Suggested Reply ({Math.round(ticket.ai_confidence * 100)}%)
          </p>
          <p className="text-sm mt-1">{ticket.ai_suggestion}</p>
        </div>
      )}
    </div>
  );
}
