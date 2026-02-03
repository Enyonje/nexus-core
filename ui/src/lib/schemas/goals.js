import { z } from "zod";

/* ======================================================
   Goal Type Schemas (frontend mirror)
====================================================== */
export const goalSchemas = {
  test: z.object({
    message: z.string().min(1, "Message is required"),
  }),
  http_request: z.object({
    url: z.string().url("Valid URL required"),
    method: z.enum(["GET", "POST", "PUT", "DELETE"]).optional(),
    headers: z.record(z.string()).optional(),
    body: z.any().optional(),
  }),
  analysis: z.object({
    data: z.record(z.any(), { required_error: "Data is required" }),
  }),
  automation: z.object({
    steps: z.array(z.string().min(1)).min(1, "At least one step required"),
  }),
  ai_analysis: z.object({
    prompt: z.string().min(1, "Prompt is required"),
  }),
  ai_summary: z.object({
    text: z.string().min(1, "Text is required"),
  }),
  ai_plan: z.object({
    objective: z.string().min(1, "Objective is required"),
  }),
};

// Base schema for goal creation
export const createGoalSchema = z.object({
  goalType: z.string().min(1, "goalType is required"),
  payload: z.any(),
});

/* ======================================================
   Validation Helpers
====================================================== */
export function validateGoal(goalType, payload) {
  // Validate base
  const baseParse = createGoalSchema.safeParse({ goalType, payload });
  if (!baseParse.success) {
    return { success: false, errors: baseParse.error.errors.map(e => e.message) };
  }

  // Validate payload by type
  const schema = goalSchemas[goalType];
  if (!schema) {
    return { success: false, errors: [`Unsupported goalType: ${goalType}`] };
  }

  const payloadParse = schema.safeParse(payload);
  if (!payloadParse.success) {
    return { success: false, errors: payloadParse.error.errors.map(e => e.message) };
  }

  return { success: true, data: { goalType, payload } };
}