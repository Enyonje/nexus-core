export const MOCK_TICKETS = [
  {
    id: "TKT-1024",
    customer: "Global Logistics Corp",
    subject: "API Timeout in Production",
    priority: "Urgent",
    status: "AI Resolved",
    sentiment: "Negative",
    timestamp: "10 mins ago",
    ai_confidence: "98.4%",
    summary: "Customer reported 504 errors. AI identified expired OAuth token.",
    customerMessage: "Our production integration is failing with 504 Gateway Timeouts. This is business critical."
  },
  {
    id: "TKT-1025",
    customer: "Sarah Jenkins",
    subject: "Billing Inquiry",
    priority: "Normal",
    status: "Pending Human",
    sentiment: "Neutral",
    timestamp: "22 mins ago",
    ai_confidence: "62.0%",
    summary: "User asking for custom invoice formatting.",
    customerMessage: "Can I get my VAT number added to my last three invoices for tax purposes?"
  },
  {
    id: "TKT-1026",
    customer: "CloudTech Startup",
    subject: "Feature Request: Bulk Upload",
    priority: "Low",
    status: "AI Categorized",
    sentiment: "Positive",
    timestamp: "1 hour ago",
    ai_confidence: "94.1%",
    summary: "Request for CSV bulk import feature.",
    customerMessage: "Loving the tool! Is there any plan to add a bulk CSV upload for historical data?"
  }
];