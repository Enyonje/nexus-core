// src/execution/retry.js
import { publishEvent } from "../events/publish.js";
import { db } from "../db/db.js";

const SYSTEM_IDENTITY = {
  sub: "nexus-core",
  role: "service",
};

export async function withRetry(fn, options = {}, context = {}) {
  const {
    retries = 3,
    backoffMs = 300,
    jitter = true,
    executionId = null,
    stepId = null,
  } = options;

  let attempt = 0;

  while (true) {
    try {
      const result = await fn();

      // Publish success event if context provided
      if (executionId && stepId) {
        await publishEvent(db, SYSTEM_IDENTITY, "EXECUTION_RETRY_SUCCESS", {
          executionId,
          stepId,
          attempt,
          result,
        });
      }

      return result;
    } catch (err) {
      attempt++;

      // Publish attempt failure
      if (executionId && stepId) {
        await publishEvent(db, SYSTEM_IDENTITY, "EXECUTION_RETRY_ATTEMPT", {
          executionId,
          stepId,
          attempt,
          error: err.message,
        });
      }

      if (attempt > retries) {
        // Publish final failure
        if (executionId && stepId) {
          await publishEvent(db, SYSTEM_IDENTITY, "EXECUTION_RETRY_FAILED", {
            executionId,
            stepId,
            error: err.message,
          });
        }
        throw err;
      }

      // Exponential backoff with optional jitter
      const delay =
        backoffMs * attempt * (jitter ? 1 + Math.random() * 0.5 : 1);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}