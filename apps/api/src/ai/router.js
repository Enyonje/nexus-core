import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

export async function generateWithFallback(prompt, systemPrompt, options = {}) {
    const providers = [
        { name: "openai", model: options.model || "gpt-4o" },
        { name: "openai-fallback", model: "gpt-4o-mini" },
    ];

    let lastError;

    for (const provider of providers) {
        try {
            if (provider.name.startsWith("openai") && openai) {
                const response = await openai.chat.completions.create({
                    model: provider.model,
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: prompt },
                    ],
                    temperature: options.temperature || 0.2,
                });

                return {
                    text: response.choices[0].message.content,
                    provider: provider.name,
                    model: provider.model,
                    tokens: response.usage,
                };
            }
        } catch (err) {
            console.warn(`[AIRouter:Fallback] Provider ${provider.name} failed: ${err.message}. Trying next provider...`);
            lastError = err;
        }
    }

    throw new Error(`All LLM providers failed. Last error: ${lastError?.message}`);
}