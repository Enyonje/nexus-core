const API_BASE =
  import.meta.env.VITE_API_URL ||
  (window.location.hostname === "nexus-core-kappa.vercel.app"
    ? "https://nexus-core-a0px.onrender.com"
    : "http://localhost:3000");

/**
 * Low-level authenticated fetch wrapper
 */
export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }

  return res.json();
}

/**
 * HIGH-LEVEL API CALLS
 * (what your UI should import)
 */

export async function fetchExecutions() {
  return apiFetch("/executions");
}

export async function fetchExecution(executionId) {
  return apiFetch(`/executions/${executionId}`);
}

export async function fetchExecutionSteps(executionId) {
  return apiFetch(`/executions/${executionId}/steps`);
}

export async function submitGoal(payload) {
  return apiFetch("/goals", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
