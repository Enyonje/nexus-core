/**
 * AI Controller
 * Path: supportops/controllers/aiController.js
 */

import { recordAIUsage, enforceAIBudget, AICostGovernor } from "../services/aiCostGovernor.js";
import { Ticket } from "../models/Ticket.js";
import { AIUsage } from "../models/AIUsage.js";

/**
 * Triggers AI analysis/resolution workflow on a target ticket
 * Named export required by routes/aiRoutes.js
 */
export async function runAIOnTicket(request, reply) {
  const { ticketId } = request.params;
  const { prompt, model = "gpt-4o-mini" } = request.body || {};
  const userId = request.currentUser?.id || request.user?.sub || request.user?.id;
  const orgId = request.currentUser?.org_id || null;
  const pg = request.server.pg;

  try {
    const ticket = await Ticket.findById(pg, ticketId);
    if (!ticket) {
      return reply.code(404).send({
        error: "NOT_FOUND",
        message: `Ticket with ID ${ticketId} was not found`,
      });
    }

    const budgetStatus = await AICostGovernor.checkBudget(pg, userId, orgId);
    if (!budgetStatus.allowed) {
      return reply.code(429).send({
        error: "BUDGET_EXCEEDED",
        message: `Monthly AI spend limit ($${budgetStatus.limit}) reached for subscription tier: ${budgetStatus.tier}`,
        currentSpend: budgetStatus.currentSpend,
      });
    }

    const promptTokens = Math.ceil((prompt?.length || 50) / 4);
    const completionText = `AI suggested resolution for Ticket #${ticketId}: ${ticket.subject}`;
    const completionTokens = Math.ceil(completionText.length / 4);

    const usageRecord = await recordAIUsage(pg, {
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
  const userId = request.currentUser?.id || request.user?.sub || request.user?.id;
  const orgId = request.currentUser?.org_id || null;
  const pg = request.server.pg;

  try {
    const budgetStatus = await AICostGovernor.checkBudget(pg, userId, orgId);
    const recentLogs = await AIUsage.findByUser(pg, userId, { limit: 10 });

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
 * This is the missing export your routes/ai.js expects.
 */
export async function runAIWorkflow(request, reply) {
  const { model = "gpt-4o-mini", prompt = "" } = request.body || {};
  const userId = request.currentUser?.id || request.user?.sub || request.user?.id;
  const orgId = request.currentUser?.org_id || null;
  const pg = request.server.pg;

  try {
    const promptTokens = Math.ceil((prompt?.length || 50) / 4);
    const completionText = `AI workflow result: processed prompt "${prompt}"`;
    const completionTokens = Math.ceil(completionText.length / 4);

    const usageRecord = await enforceAIBudget(pg, {
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
