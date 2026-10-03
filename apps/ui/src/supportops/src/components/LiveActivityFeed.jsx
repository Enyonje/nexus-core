import React, { useState, useEffect } from 'react';
// This import must match the file name in your src/utils folder
import { generateMockEvent } from '../utils/mockData';

const LiveActivityFeed = ({ isDemoMode, onTicketClick }) => {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    if (isDemoMode) {
      // Load initial mock data for the visual "wow" factor
      setEvents([generateMockEvent(), generateMockEvent(), generateMockEvent()]);

      // Set up a clean interval to simulate real-time AI activity
      const interval = setInterval(() => {
        setEvents(prev => [generateMockEvent(), ...prev.slice(0, 4)]);
      }, 3500);

      return () => clearInterval(interval);
    } else {
      // Logic for Live Mode (fetching from your real Render backend)
      const fetchLiveTickets = async () => {
        try {
          const res = await fetch('https://supportops-ai.onrender.com/api/v1/tickets');
          const data = await res.json();
          // Ensure data is an array before setting state
          if (Array.isArray(data)) {
            setEvents(data);
          }
        } catch (e) {
          console.error("Live fetch failed. Check your Render backend status.");
        }
      };
      
      fetchLiveTickets();
      const interval = setInterval(fetchLiveTickets, 10000);
      return () => clearInterval(interval);
    }
  }, [isDemoMode]);

  return (
    <div className="space-y-3">
      {events.length > 0 ? (
        events.map((event) => (
          <div 
            key={event.id} 
            onClick={() => onTicketClick(event)}
            className="group flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-blue-500/50 hover:bg-white/10 cursor-pointer transition-all animate-in fade-in slide-in-from-top-2 duration-500"
          >
            <div className="flex items-center gap-4">
              {/* Status Indicator */}
              <div className={`w-2 h-2 rounded-full ${event.status === 'completed' ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-blue-500 animate-pulse shadow-[0_0_8px_#3b82f6]'}`} />
              
              <div>
                <p className="text-sm font-bold text-slate-200 group-hover:text-blue-400 transition-colors">
                  {event.ticket}
                </p>
                <p className="text-xs text-slate-500 italic">
                  {event.action}...
                </p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1">
              <span className="text-[10px] font-mono text-slate-600 uppercase">
                {event.timestamp || "Live"}
              </span>
              <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/5 text-slate-500 border border-white/5 group-hover:border-blue-500/30 transition-all">
                Detail →
              </span>
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-10">
          <p className="text-slate-500 text-sm italic">Waiting for incoming activity...</p>
        </div>
      )}
    </div>
  );
};

export default LiveActivityFeed;