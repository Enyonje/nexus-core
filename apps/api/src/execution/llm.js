// src/execution/llm.js
// Shared helpers for goal handlers and the agent loop.
import OpenAI from "openai";
import { v5 as uuidv5 } from "uuid";
import dotenv from "dotenv";

dotenv.config();

const NS = "6f1b2d5e-3c4a-4e8b-9a71-2d0c5b8f1a34";

// Deterministic ids: the same step gets the same id on a retry-from-step, so rows upsert instead of duplicating
export const stepId = (executionId, key) => uuidv5(`${executionId}:${key}`, NS);

// An error that must not be retried
export const fatal = (msg, status = 400) => Object.assign(new Error(msg), { status, retryable: false });

// Lazy client: a missing key no longer crashes the server at import time
let _openai = null;
export function openai() {
    if (!process.env.OPENAI_API_KEY) throw fatal("OPENAI_API_KEY is not configured", 500);
    return (_openai ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 1, timeout: 60_000 }));
}