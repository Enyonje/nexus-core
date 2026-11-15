import OpenAI from "openai";
import { prisma } from "../lib/deps.js";

const MODEL = process.env.SUPPORTOPS_AI_MODEL || "gpt-4o-mini";
const RATES_PER_MILLION = {
  "gpt-4o-mini": { input: 0.15, output: 0.60 },
  "gpt-4o": { input: 2.50, output: 10.00 },
};

function estimateCost(model, promptTokens, completionTokens) {
  const rates = RATES_PER_MILLION[model] || RATES_PER_MILLION["gpt-4o-mini"];
  return Number(((promptTokens * rates.input + completionTokens * rates.output) / 1_000_000).toFixed(8));
}

function jsonFromCompletion(content) {
  if (!content) throw new Error("The AI provider returned an empty response.");
  const parsed = JSON.parse(content);
  const reply = typeof parsed.reply === "string" ? parsed.reply.trim() : "";
  const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";
  const confidence = Number(parsed.confidence);
  if (!reply || reply.length > 4000 || !summary || !Number.isFinite(confidence)) {
    throw new Error("The AI provider returned an invalid draft format.");
  }
  return {
    reply,
    summary: summary.slice(0, 1200),
    confidence: Math.max(0, Math.min(100, confidence)),
    action: typeof parsed.action === "string" ? parsed.action.slice(0, 120) : "DRAFT_REPLY",
  };
}

export async function runAIOnTicket(request, reply) {
  const orgId = request.access?.org?.id;
  const userId = request.access?.user?.id;
  const ticketId = String(request.params.ticketId || "");
  if (!orgId || !userId) return reply.code(403).send({ error: "SUPPORTOPS_WORKSPACE_ACCESS_DENIED" });
  if (!process.env.OPENAI_API_KEY) {
    return reply.code(503).send({ error: "AI_NOT_CONFIGURED", message: "SupportOps AI is not configured. Add OPENAI_API_KEY to the Nexus API environment." });
  }
  if (!ticketId || ticketId.length > 100) return reply.code(400).send({ error: "INVALID_TICKET_ID" });

  try {
    const ticket = await prisma.supportTicket.findFirst({
      where: { id: ticketId, org_id: orgId },
      include: { customer: { select: { name: true, external_ref: true } }, messages: { orderBy: { created_at: "asc" }, take: 30 } },
    });
    if (!ticket) return reply.code(404).send({ error: "TICKET_NOT_FOUND" });

    const limit = request.access.limit?.("ai_resolutions");
    const monthStart = new Date();
    monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
    const used = await prisma.aIUsage.count({ where: { org_id: orgId, action: "ticket_draft", created_at: { gte: monthStart } } });
    if (limit !== null && limit !== undefined && used >= limit) {
      return reply.code(429).send({ error: "AI_LIMIT_REACHED", limit, used, message: "This workspace has reached its monthly AI resolution allowance." });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const conversation = ticket.messages.map((m) => `${m.direction === "inbound" ? "Customer" : "Support"}: ${m.body}`).join("\n");
    const completion = await client.chat.completions.create({
      model: MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are a careful customer-support drafting assistant. Produce a concise, empathetic, factual reply based only on the ticket context. Never claim an action was completed if it is not evidenced. If information is missing, ask a clarifying question. Return JSON with string fields reply, summary, action and numeric confidence from 0 to 100. The reply is a draft for human review and must never be sent automatically." },
        { role: "user", content: JSON.stringify({ subject: ticket.subject, priority: ticket.priority, status: ticket.status, customer: ticket.customer?.name || "Customer", conversation: conversation || "No conversation messages are available." }) },
      ],
    });
    const result = jsonFromCompletion(completion.choices?.[0]?.message?.content);
    const promptTokens = completion.usage?.prompt_tokens || 0;
    const completionTokens = completion.usage?.completion_tokens || 0;
    const totalTokens = completion.usage?.total_tokens || promptTokens + completionTokens;
    const costUsd = estimateCost(MODEL, promptTokens, completionTokens);

    const [proposal, usage] = await prisma.$transaction([
      prisma.aIActionProposal.create({
        data: {
          org_id: orgId, ticket_id: ticket.id, user_id: userId,
          action_type: result.action || "DRAFT_REPLY", summary: result.summary,
          payload: { draft_reply: result.reply }, confidence_score: result.confidence,
          risk_level: "low", status: "pending",
        },
      }),
      prisma.aIUsage.create({
        data: { org_id: orgId, ticket_id: ticket.id, user_id: userId, provider: "openai", model: MODEL, prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: totalTokens, cost_usd: costUsd, action: "ticket_draft" },
      }),
    ]);

    return reply.code(200).send({
      success: true, ticketId: ticket.id, proposalId: proposal.id, status: "pending_review",
      draft: { reply: result.reply, summary: result.summary, confidence: result.confidence },
      usage: { model: MODEL, promptTokens, completionTokens, totalTokens, costUsd, usedThisMonth: used + 1, limit: limit ?? null },
      message: "Draft generated and saved for human approval. It has not been sent to the customer.",
    });
  } catch (error) {
    request.log.error({ err: error, ticketId }, "SupportOps AI ticket drafting failed");
    if (error?.status === 429) return reply.code(429).send({ error: "AI_PROVIDER_RATE_LIMIT", message: "The AI provider is temporarily rate-limiting requests. Try again shortly." });
    return reply.code(502).send({ error: "AI_DRAFT_FAILED", message: "SupportOps could not generate a draft. No customer message was sent." });
  }
}
