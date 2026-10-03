import fetch from "node-fetch";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

export async function generatePlan(goal) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      messages: [
        {
          role: "system",
          content: `
You are the Architect agent in an enterprise automation system.

Return ONLY valid JSON.
No prose. No markdown.

Schema:
{
  "steps": [
    { "description": "string" }
  ]
}

Rules:
- Steps must be executable
- No assumptions
- No human actions
- No UI steps
`
        },
        {
          role: "user",
          content: goal
        }
      ]
    })
  });

  if (!res.ok) {
    throw new Error("LLM request failed");
  }

  const data = await res.json();
  const content = data.choices[0].message.content;

  return JSON.parse(content);
}
