const API_BASE = "https://nexus-core-a0px.onrender.com";

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    credentials: "include", // ensures cookies/session are sent
    ...options,
  });

  // Handle non-OK responses
  if (!res.ok) {
    let message;
    try {
      const data = await res.json();
      message = data.error || JSON.stringify(data);
    } catch {
      message = await res.text();
      if (!message) message = res.statusText;
    }
    throw new Error(`${res.status} ${message}`);
  }

  // Handle empty response bodies (e.g. 204 No Content)
  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}