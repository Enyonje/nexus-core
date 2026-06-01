// regulation-service/providers/tradeTariffProvider.js
const axios = require('axios');

const BASE_URL = 'https://www.trade-tariff.service.gov.uk/api/v2';

async function getTariffData(hsCode) {
  try {
    const res = await axios.get(`${BASE_URL}/commodities/${hsCode}`, {
      timeout: 10000
    });

    return res.data.data;
  } catch (err) {
    throw new Error(`TradeTariff API error: ${err.message}`);
  }
}

module.exports = { getTariffData };