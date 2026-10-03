// High-fidelity event generator for SupportOps Demo
export const generateMockEvent = () => {
  const actions = [
    { text: "Analyzing API Logs", icon: "search" },
    { text: "Optimizing Workflow #12", icon: "zap" },
    { text: "Validating Security Protocol", icon: "shield" },
    { text: "Routing Ticket to Autonomous Agent", icon: "route" },
    { text: "Calculating ROI Impact", icon: "trending-up" },
    { text: "Resolving OAuth Timeout", icon: "check-circle" }
  ];

  const customers = [
    "Global Logistics Corp", 
    "Vertex Systems", 
    "CloudScale AI", 
    "Nexus Fintech", 
    "AeroSpace Dynamics"
  ];

  const randomAction = actions[Math.floor(Math.random() * actions.length)];
  const randomCustomer = customers[Math.floor(Math.random() * customers.length)];
  const ticketId = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;

  return {
    id: Math.random().toString(36).substr(2, 9),
    ticket: ticketId,
    customer: randomCustomer,
    action: randomAction.text,
    status: Math.random() > 0.3 ? "completed" : "processing",
    timestamp: "Just now",
    ai_confidence: `${(92 + Math.random() * 7).toFixed(1)}%`,
    customerMessage: `Incoming request from ${randomCustomer} regarding system latency.`,
    revenue_impact: "$420.00" // Simulated savings per ticket
  };
};