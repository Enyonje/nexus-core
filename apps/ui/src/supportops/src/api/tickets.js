const API = "https://supportops-ai.onrender.com/api/v1/tickets";

export async function fetchTickets() {
  const res = await fetch(API);
  return res.json();
}

export async function createTicket(data) {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  return res.json();
}
