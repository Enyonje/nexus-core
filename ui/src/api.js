const API_URL = import.meta.env.VITE_API_URL;

/**
 * Low-level authenticated fetch wrapper
 */
export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  // Handle errors gracefully
  if (!res.ok) {
    // Try to parse JSON error, fallback to text
    let errorMessage = `Request failed: ${res.status}`;
    try {
      const errorJson = await res.json();
      errorMessage = errorJson.error || errorMessage;
    } catch {
      const text = await res.text();
      if (text) errorMessage = text;
    }
    throw new Error(errorMessage);
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