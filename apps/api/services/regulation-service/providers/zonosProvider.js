// regulation-service/providers/zonosProvider.js
const axios = require('axios');

async function checkZonosCompliance(data) {
  const res = await axios.post(
    'https://api.zonos.com/classify',
    {
      items: data.items,
      destination: data.destination,
      origin: data.origin
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.ZONOS_API_KEY}`
      },
      timeout: 10000
    }
  );

  return res.data;
}

module.exports = { checkZonosCompliance };