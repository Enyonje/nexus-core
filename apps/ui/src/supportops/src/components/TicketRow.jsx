// src/components/TicketRow.jsx
export default function TicketRow({ ticket, onClick }) {
  const statusStyles = {
    Open: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    Pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    Resolved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  };

  const priorityStyles = {
    Urgent: "text-red-400",
    High: "text-amber-400",
    Normal: "text-slate-400",
  };

  return (
    <div
      onClick={onClick}
      className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-white/5 
                 hover:bg-white/5 cursor-pointer transition group"
    >
      {/* ID */}
      <div className="col-span-2 font-mono text-xs text-slate-400">
        {ticket.id}
      </div>

      {/* SUBJECT */}
      <div className="col-span-5">
        <p className="font-semibold text-white group-hover:text-blue-400 transition">
          {ticket.subject}
        </p>
        <p className="text-xs text-slate-500 italic">
          {ticket.summary}
        </p>
      </div>

      {/* PRIORITY */}
      <div className={`col-span-2 text-xs font-bold ${priorityStyles[ticket.priority]}`}>
        {ticket.priority}
      </div>

      {/* STATUS */}
      <div className="col-span-2">
        <span
          className={`text-[10px] px-3 py-1 rounded-full border uppercase font-black
            ${statusStyles[ticket.status]}`}
        >
          {ticket.status}
        </span>
      </div>

      {/* TIME */}
      <div className="col-span-1 text-xs text-slate-500 text-right">
        {ticket.timestamp}
      </div>
    </div>
  );
}
