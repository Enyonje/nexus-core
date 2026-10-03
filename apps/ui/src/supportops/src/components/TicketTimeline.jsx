import React, { useEffect, useState } from "react";
import { Bot, User, Shield, Clock } from "lucide-react";
import toast from "react-hot-toast";

const API_BASE_URL = "https://supportops-ai.onrender.com";

const ACTOR_META = {
  AI: {
    icon: Bot,
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/30"
  },
  USER: {
    icon: User,
    color: "text-green-400",
    bg: "bg-green-500/10 border-green-500/30"
  },
  SYSTEM: {
    icon: Shield,
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/30"
  }
};

export default function TicketTimeline({ ticketId }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ticketId) return;

    const fetchTimeline = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/v1/tickets/${ticketId}/timeline`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`
            }
          }
        );

        if (!res.ok) throw new Error("Failed to load timeline");

        const data = await res.json();
        setEvents(data);
      } catch (err) {
        toast.error("Could not load audit timeline");
      } finally {
        setLoading(false);
      }
    };

    fetchTimeline();
  }, [ticketId]);

  if (loading) {
    return (
      <div className="text-xs text-slate-500 italic">
        Loading audit timeline…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {events.map((event, index) => {
        const meta = ACTOR_META[event.actor] || ACTOR_META.SYSTEM;
        const Icon = meta.icon;

        return (
          <div key={index} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center border ${meta.bg}`}
              >
                <Icon size={16} className={meta.color} />
              </div>
              {index !== events.length - 1 && (
                <div className="w-px flex-1 bg-white/10 mt-2" />
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                  {event.actor}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-500">
                  {event.action.replaceAll("_", " ")}
                </span>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-slate-300">
                {event.details || "No additional details"}
              </div>

              <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-500">
                <Clock size={10} />
                {new Date(event.created_at).toLocaleString()}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
