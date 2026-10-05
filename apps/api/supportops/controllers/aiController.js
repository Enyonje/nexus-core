/**
 * AI Controller
 * Path: supportops/controllers/aiController.js
 */

import { recordAIUsage, enforceAIBudget, AICostGovernor } from "../services/aiCostGovernor.js";
import { Ticket } from "../models/Ticket.js";
import { AIUsage } from "../models/AIUsage.js";

/**
 * Extracts normalized user ID and org ID from Fastify entitlement context or legacy request props
 */
function getAuthContext(request) {
  const userId =
    request.access?.user?.id ||
    request.currentUser?.id ||
    request.user?.sub ||
    request.user?.id;

  const orgId =
    request.access?.org?.id ||
    request.currentUser?.org_id ||
    request.user?.org_id ||
    null;

  return { userId, orgId };
}

/**
 * Triggers AI analysis/resolution workflow on a target ticket
 * Named export required by routes/aiRoutes.js
 */
export async function runAIOnTicket(request, reply) {
  const { ticketId } = request.params;
  const { prompt, model = "gpt-4o-mini" } = request.body || {};
  const { userId, orgId } = getAuthContext(request);
  const db = request.server.pg || request.server.prisma;

  try {
    const ticket = await Ticket.findById(db, ticketId);
    if (!ticket) {
      return reply.code(404).send({
        error: "NOT_FOUND",
        message: `Ticket with ID ${ticketId} was not found`,
      });
    }

    const budgetStatus = await AICostGovernor.checkBudget(db, userId, orgId);
    if (!budgetStatus.allowed) {
      return reply.code(429).send({
        error: "BUDGET_EXCEEDED",
        message: `Monthly AI spend limit ($${budgetStatus.limit}) reached for subscription tier: ${budgetStatus.tier}`,
        currentSpend: budgetStatus.currentSpend,
      });
    }

    const promptTokens = Math.ceil((prompt?.length || 50) / 4);
    const completionText = `AI suggested resolution for Ticket #${ticketId}: ${ticket.subject ?? "No Subject"}`;
    const completionTokens = Math.ceil(completionText.length / 4);

    const usageRecord = await recordAIUsage(db, {
      userId,
      orgId,
      ticketId,
      model,
      promptTokens,
      completionTokens,
      provider: "openai",
      metadata: { action: "ticket_auto_summary" },
    });

    return reply.code(200).send({
      success: true,
      ticketId,
      result: completionText,
      usage: {
        model: usageRecord.model,
        promptTokens: usageRecord.promptTokens,
        completionTokens: usageRecord.completionTokens,
        costUsd: usageRecord.costUsd,
      },
    });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({
      error: "INTERNAL_SERVER_ERROR",
      message: err.message || "An error occurred while running AI on the ticket",
    });
  }
}

/**
 * Retrieves AI token consumption and monthly budget stats for current user
 */
export async function getUsageSummary(request, reply) {
  const { userId, orgId } = getAuthContext(request);
  const db = request.server.pg || request.server.prisma;

  try {
    const budgetStatus = await AICostGovernor.checkBudget(db, userId, orgId);
    const recentLogs = await AIUsage.findByUser(db, userId, { limit: 10 });

    return reply.code(200).send({
      budget: budgetStatus,
      recentUsage: recentLogs,
    });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({
      error: "INTERNAL_SERVER_ERROR",
      message: "Failed to retrieve AI usage metrics",
    });
  }
}

/**
 * Generic workflow runner — wrapper around enforceAIBudget
 * Executed by routes/ai.js
 */
export async function runAIWorkflow(request, reply) {
  const { model = "gpt-4o-mini", prompt = "" } = request.body || {};
  const { userId, orgId } = getAuthContext(request);
  const db = request.server.pg || request.server.prisma;

  try {
    const promptTokens = Math.ceil((prompt?.length || 50) / 4);
    const completionText = `AI workflow result: processed prompt "${prompt}"`;
    const completionTokens = Math.ceil(completionText.length / 4);

    const usageRecord = await enforceAIBudget(db, {
      userId,
      orgId,
      model,
      promptTokens,
      completionTokens,
      provider: "openai",
      metadata: { action: "workflow_run" },
    });

    return reply.code(200).send({
      success: true,
      result: completionText,
      usage: {
        model: usageRecord.model,
        promptTokens: usageRecord.promptTokens,
        completionTokens: usageRecord.completionTokens,
        costUsd: usageRecord.costUsd,
      },
    });
  } catch (err) {
    request.log.error(err);
    return reply.code(400).send({
      error: "WORKFLOW_FAILED",
      message: err.message || "AI workflow execution failed",
    });
  }
}

// Default export container
export default {
  runAIOnTicket,
  getUsageSummary,
  runAIWorkflow,
};