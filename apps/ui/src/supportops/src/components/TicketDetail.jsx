import React from 'react';

export default function TicketDetail({ ticket, auditTrail }) {
  return (
    <div className="grid grid-cols-2 gap-6 p-6">
      {/* Left: The Raw Ticket */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold mb-4">{ticket.subject}</h2>
        <p className="text-gray-600 whitespace-pre-wrap">{ticket.description}</p>
        <div className="mt-4 pt-4 border-t text-sm text-gray-400">
          From: {ticket.customer_email}
        </div>
      </div>

      {/* Right: AI "Internal Monologue" */}
      <div className="bg-indigo-900 text-indigo-100 p-6 rounded-xl shadow-lg font-mono text-sm">
        <h3 className="text-indigo-300 font-bold mb-4 uppercase tracking-widest text-xs">AI Audit Trail</h3>
        {auditTrail.map((log, i) => (
          <div key={i} className="mb-4 border-l-2 border-indigo-500 pl-4">
            <div className="text-indigo-400 text-xs">{new Date(log.timestamp).toLocaleTimeString()}</div>
            <div className="font-bold text-white">{log.event_type}</div>
            <pre className="mt-2 text-indigo-200 overflow-x-auto">
              {JSON.stringify(log.payload, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}