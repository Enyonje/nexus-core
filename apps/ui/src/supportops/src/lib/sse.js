/**
 * Small, dependency-free Server-Sent Events parser for fetch() streams.
 * Supports chunk boundaries, CRLF, comments/heartbeats, multi-line data and
 * malformed JSON without tearing down the stream.
 */
export function parseSseFrame(frame) {
  const fields = { data: [] };
  for (const line of frame.split(/\r?\n/)) {
    if (!line || line.startsWith(":")) continue;
    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? "" : line.slice(colon + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    if (field === "data") fields.data.push(value);
    else if (field === "event") fields.event = value;
    else if (field === "id" && !value.includes("\0")) fields.id = value;
    else if (field === "retry" && /^\d+$/.test(value)) fields.retry = Number(value);
  }
  if (!fields.data.length) return null;
  const raw = fields.data.join("\n");
  let data = raw;
  try { data = JSON.parse(raw); } catch { /* plain-text SSE payload */ }
  return { type: fields.event || "message", data, id: fields.id ?? null, retry: fields.retry ?? null };
}

export function parseSseFrames(buffer, onEvent) {
  // Normalize CRLF while retaining a trailing CR that may be split across chunks.
  const normalized = buffer.replace(/\r\n/g, "\n");
  const frames = normalized.split("\n\n");
  const remainder = frames.pop() ?? "";
  for (const frame of frames) {
    const event = parseSseFrame(frame);
    if (event) onEvent(event);
  }
  return remainder;
}

export async function consumeSseResponse(response, onEvent, signal) {
  if (!response?.ok) {
    const error = new Error(`Event stream request failed (${response?.status ?? "no response"})`);
    error.status = response?.status;
    throw error;
  }
  const contentType = response.headers?.get?.("content-type") || "";
  if (!contentType.toLowerCase().includes("text/event-stream")) {
    const error = new Error("Server did not return an event stream");
    error.status = response.status;
    throw error;
  }
  if (!response.body?.getReader) throw new Error("Streaming responses are not supported by this browser");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (!signal?.aborted) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      buffer = parseSseFrames(buffer, onEvent);
    }
    buffer += decoder.decode();
    if (buffer.trim()) {
      const event = parseSseFrame(buffer);
      if (event) onEvent(event);
    }
  } finally {
    if (signal?.aborted) {
      try { await reader.cancel(); } catch { /* connection already closed */ }
    }
    reader.releaseLock?.();
  }
}


const abortableDelay = (ms, signal) => new Promise((resolve) => {
  if (signal?.aborted) return resolve();
  const timer = setTimeout(done, ms);
  function done() {
    clearTimeout(timer);
    signal?.removeEventListener("abort", done);
    resolve();
  }
  signal?.addEventListener("abort", done, { once: true });
});

/**
 * Maintains an authenticated fetch-SSE connection. 401/403 are terminal;
 * transient network/5xx/429 failures reconnect with bounded exponential backoff.
 */
export async function listenSse(url, onEvent, signal, headers = {}, onStatus = () => {}) {
  let attempt = 0;
  while (!signal?.aborted) {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "text/event-stream", ...headers },
        cache: "no-store",
        credentials: "include",
        signal,
      });
      if (response.status === 401 || response.status === 403) {
        onStatus("error");
        if (response.status === 401 && typeof window !== "undefined") {
          window.dispatchEvent(new Event("auth:unauthorized"));
        }
        return;
      }
      onStatus("connected");
      await consumeSseResponse(response, onEvent, signal);
      attempt = 0;
      if (!signal?.aborted) onStatus("reconnecting");
    } catch (error) {
      if (signal?.aborted || error?.name === "AbortError") return;
      if (error?.status === 401 || error?.status === 403) {
        onStatus("error");
        return;
      }
      onStatus("reconnecting");
    }
    if (!signal?.aborted) {
      attempt += 1;
      const base = Math.min(30_000, 1_000 * (2 ** Math.min(attempt - 1, 5)));
      const delay = Math.round(base * (0.8 + Math.random() * 0.4));
      await abortableDelay(delay, signal);
    }
  }
  onStatus("disconnected");
}
