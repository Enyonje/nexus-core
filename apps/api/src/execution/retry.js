// src/execution/retry.js
import { publishEvent } from "./runtime.js";

const abortError = () => Object.assign(new Error("Execution cancelled"), { name: "AbortError", retryable: false });

/**
 * Async retry with exponential backoff, full jitter, per-attempt timeout,
 * cancellation, and non-retryable error classification.
 * options: { retries, backoffMs, maxBackoffMs, timeoutMs, jitter, executionId, stepId, signal, isRetryable }
 */
export async function withRetry(fn, options = {}) {
  const {
    retries = 3,
    backoffMs = 300,
    maxBackoffMs = 10000,
    timeoutMs = 30000,
    jitter = true,
    executionId = null,
    stepId = null,
    signal = null,
    isRetryable = defaultIsRetryable,
  } = options;

  let attempt = 0;

  for (; ;) {
    if (signal?.aborted) throw abortError();

    try {
      return await executeWithTimeout(fn, timeoutMs, signal);
    } catch (err) {
      attempt++;
      if (signal?.aborted || !isRetryable(err) || attempt > retries) throw err;

      const delay = calculateBackoffDelay(attempt, backoffMs, maxBackoffMs, jitter);
      if (executionId && stepId) {
        // One event type the UI can show as "retrying (2/3)". Final failure is reported by step_failed.
        await safePublish(executionId, {
          event: "execution_step_retrying",
          stepId: String(stepId),
          attempt,
          maxRetries: retries,
          nextDelayMs: delay,
          error: err.message,
          code: err.code || err.status || "UNKNOWN_ERROR",
        });
      }
      await sleep(delay, signal);
    }
  }
}

/* Full-jitter exponential backoff: random(0, min(max, base * 2^(attempt-1))) */
function calculateBackoffDelay(attempt, base, max, useJitter) {
  const exp = Math.min(max, base * Math.pow(2, attempt - 1));
  return useJitter ? Math.floor(Math.random() * exp) : exp;
}

// Resolves early on abort so cancelling never waits out a backoff
function sleep(ms, signal) {
  return new Promise((resolve) => {
    const timer = setTimeout(done, ms);
    function done() { clearTimeout(timer); signal?.removeEventListener("abort", done); resolve(); }
    signal?.addEventListener("abort", done, { once: true });
  });
}

async function executeWithTimeout(fn, timeoutMs, signal) {
  let timer;
  let onAbort;
  const guard = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(Object.assign(new Error(`Operation timed out after ${timeoutMs}ms`), { code: "ETIMEDOUT" }));
    }, timeoutMs);
    if (signal) {
      onAbort = () => reject(abortError());
      signal.addEventListener("abort", onAbort, { once: true });
    }
  });
  try {
    return await Promise.race([fn(), guard]);
  } finally {
    clearTimeout(timer);
    if (signal && onAbort) signal.removeEventListener("abort", onAbort);
  }
}

/* Don't retry validation, auth or other 4xx errors, cancellations, or errors flagged `retryable: false`. 429 is retried. */
function defaultIsRetryable(error) {
  if (error?.retryable === false || error?.name === "AbortError") return false;
  const status = error?.status || error?.statusCode || error?.response?.status;
  if (status && status >= 400 && status < 500) return status === 429;
  return true;
}

// Telemetry must never break the run
async function safePublish(executionId, event) {
  try {
    await publishEvent(executionId, event);
  } catch (err) {
    console.error(`[RetryEngine] Failed to publish '${event.event}':`, err);
  }
}