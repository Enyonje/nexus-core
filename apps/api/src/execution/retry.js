// src/execution/retry.js
import { publishEvent } from "../events/publish.js";
import { db } from "../db/db.js";

const SYSTEM_IDENTITY = {
  sub: "nexus-core",
  role: "service",
};

/**
 * Enterprise-grade Async Retry wrapper with Exponential Backoff, 
 * Full Jitter, Execution Timeout bounds, and Non-retryable Error Classification.
 */
export async function withRetry(fn, options = {}, context = {}) {
  const {
    retries = 3,
    backoffMs = 300,
    maxBackoffMs = 10000,
    timeoutMs = 30000,
    jitter = true,
    executionId = null,
    stepId = null,
    isRetryable = defaultIsRetryable,
  } = options;

  let attempt = 0;

  while (true) {
    try {
      // Wrap operation with strict per-attempt timeout execution limit
      const result = await executeWithTimeout(fn, timeoutMs);

      // Only publish retry-success if a retry actually took place
      if (attempt > 0 && executionId && stepId) {
        await safePublishEvent("EXECUTION_RETRY_SUCCESS", {
          executionId,
          stepId,
          attempt,
          durationMs: result.durationMs,
        });
      }

      return result.data;
    } catch (err) {
      attempt++;

      const isFatal = !isRetryable(err);

      // Publish attempt failure trace
      if (executionId && stepId) {
        await safePublishEvent("EXECUTION_RETRY_ATTEMPT", {
          executionId,
          stepId,
          attempt,
          isFatal,
          error: err.message,
          code: err.code || err.status || "UNKNOWN_ERROR",
        });
      }

      // Stop immediately if max retries exceeded or error marked as fatal/non-retryable
      if (attempt > retries || isFatal) {
        if (executionId && stepId) {
          await safePublishEvent("EXECUTION_RETRY_FAILED", {
            executionId,
            stepId,
            totalAttempts: attempt,
            fatalReason: isFatal ? "NON_RETRYABLE_ERROR" : "EXCEEDED_MAX_RETRIES",
            error: err.message,
          });
        }
        throw err;
      }

      // Calculate true exponential backoff with full jitter
      const delay = calculateBackoffDelay(attempt, backoffMs, maxBackoffMs, jitter);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

/* =========================================================
   Utility Helpers & Strategy Classifiers
========================================================= */

/**
 * Calculates exponential delay with Full Jitter to prevent stampeding herd issues.
 * Formula: min(maxBackoffMs, backoffMs * 2^(attempt - 1)) * Jitter
 */
function calculateBackoffDelay(attempt, baseBackoff, maxBackoff, useJitter) {
  const expDelay = Math.min(maxBackoff, baseBackoff * Math.pow(2, attempt - 1));
  if (!useJitter) return expDelay;

  // Full Jitter algorithm
  return Math.floor(Math.random() * expDelay);
}

/**
 * Enforces per-attempt execution timeout.
 */
async function executeWithTimeout(fn, timeoutMs) {
  const startTime = Date.now();
  let timer;

  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const timeoutError = new Error(`Operation timed out after ${timeoutMs}ms`);
      timeoutError.code = "ETIMEDOUT";
      reject(timeoutError);
    }, timeoutMs);
  });

  try {
    const data = await Promise.race([fn(), timeoutPromise]);
    return { data, durationMs: Date.now() - startTime };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Default Classifier to prevent retrying 4xx client/validation errors or auth failures.
 */
function defaultIsRetryable(error) {
  const status = error.status || error.statusCode || error.response?.status;

  // Do not retry 4xx Client Errors (400, 401, 403, 404, 422)
  if (status && status >= 400 && status < 500) {
    // Exception: 429 Rate Limits are retryable
    if (status === 429) return true;
    return false;
  }

  // Network errors, timeouts, and 5xx server errors are retryable
  return true;
}

/**
 * Non-blocking event publication to protect main execution loop from telemetry crashes.
 */
async function safePublishEvent(eventType, payload) {
  try {
    await publishEvent(db, SYSTEM_IDENTITY, eventType, payload);
  } catch (pubErr) {
    console.error(`[RetryEngine:EventError] Failed to publish event '${eventType}':`, pubErr);
  }
}