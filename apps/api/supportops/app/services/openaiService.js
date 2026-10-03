import OpenAI from "openai";
import AIUsage from "../models/AIUsage.js";
import AIActionProposal from "../models/AIActionProposal.js";
import { calculateCost } from "./aiBillingService.js";
import { selectPromptVersion } from "./promptSelector.js";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function generateAIProposal({
  orgId,
  ticketId,
  customerMessage,
  priority
}) {
  const prompt = await selectPromptVersion();

  const completion = await client.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.2,
    messages: [
      { role: "system", content: prompt.systemPrompt },
      {
        role: "user",
        content: `
Priority: ${priority}
Message: "${customerMessage}"

Return JSON:
reply, action, confidence
`
      }
    ]
  });

  const usage = completion.usage;

  const billing = calculateCost({
    model: "gpt-4o",
    promptTokens: usage.prompt_tokens,
    completionTokens: usage.completion_tokens
  });

  await AIUsage.create({
    orgId,
    ticketId,
    model: "gpt-4o",
    promptTokens: usage.prompt_tokens,
    completionTokens: usage.completion_tokens,
    totalTokens: billing.totalTokens,
    costUSD: billing.costUSD
  });

  const aiResult = JSON.parse(
    completion.choices[0].message.content
  );

  return await AIActionProposal.create({
    ticketId,
    promptVersion: prompt.version,
    aiReply: aiResult.reply,
    suggestedAction: aiResult.action,
    confidence: aiResult.confidence
  });
}
