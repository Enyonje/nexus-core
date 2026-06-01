// shared/aiService.js
const axios = require('axios');
const pRetry = require('p-retry');
const { logger } = require('./eventBus');

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

async function callAI(prompt) {
  return pRetry(async () => {
    const res = await axios.post(
      OPENAI_URL,
      {
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        timeout: 15000,
      }
    );

    return res.data.choices[0].message.content;
  }, {
    retries: 3,
    onFailedAttempt: err => {
      logger.warn(`AI retry ${err.attemptNumber}`);
    }
  });
}

module.exports = { callAI };