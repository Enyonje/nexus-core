"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.callAI = callAI;
const axios_1 = __importDefault(require("axios"));
const p_retry_1 = __importDefault(require("p-retry"));
const eventBus_1 = require("./eventBus");
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
async function callAI(prompt) {
    return (0, p_retry_1.default)(async () => {
        const res = await axios_1.default.post(OPENAI_URL, {
            model: process.env.OPENAI_MODEL || "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.2,
        }, {
            headers: {
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            timeout: 15000,
        });
        // Type narrowing: ensure choices exist
        if (!res.data?.choices?.[0]?.message?.content) {
            throw new Error("Invalid AI response format");
        }
        return res.data.choices[0].message.content;
    }, {
        retries: 3,
        onFailedAttempt: (err) => {
            eventBus_1.logger.warn(`AI retry ${err.attemptNumber}`);
        },
    });
}
