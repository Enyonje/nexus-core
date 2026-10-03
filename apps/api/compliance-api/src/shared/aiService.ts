import axios from "axios";
import pRetry from "p-retry";
import { logger } from "./eventBus";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export async function callAI(prompt: string): Promise<string> {
  return pRetry(
    async () => {
      const res = await axios.post(
        OPENAI_URL,
        {
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          timeout: 15000,
        }
      );

      // Type narrowing: ensure choices exist
      if (!res.data?.choices?.[0]?.message?.content) {
        throw new Error("Invalid AI response format");
      }

      return res.data.choices[0].message.content as string;
    },
    {
      retries: 3,
      onFailedAttempt: (err) => {
        logger.warn(`AI retry ${err.attemptNumber}`);
      },
    }
  );
}
