import { requireProductAuth } from "../auth/guard.js";

const BASE = (env) => (env.MPESA_ENV === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke");

async function accessToken(env, fetchImpl) {
  const auth = Buffer.from(`${env.MPESA_CONSUMER_KEY}:${env.MPESA_CONSUMER_SECRET}`).toString("base64");
  const res = await fetchImpl(`${BASE(env)}/oauth/v1/generate?grant_type=client_credentials`, { headers: { Authorization: `Basic ${auth}` } });
  if (!res.ok) throw new Error(`Daraja auth failed (${res.status})`);
  return (await res.json()).access_token;
}

function password(env) {
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
  const pw = Buffer.from(`${env.MPESA_BUSINESS_SHORTCODE}${env.MPESA_PASSKEY}${timestamp}`).toString("base64");
  return { timestamp, password: pw };
}

/**
 * M-Pesa duty payments for the Compliance product (ported from a Next.js route that never ran on Fastify).
 *   POST /api/payments/mpesa/stkpush  { phoneNumber, amount, accountReference }
 *   GET  /api/payments/mpesa/query?checkoutRequestId=...
 *   POST /api/payments/mpesa/callback (Safaricom -> us)
 */
export function mpesaRoutes({ env = process.env, fetchImpl = fetch } = {}) {
  const configured = () => ["MPESA_CONSUMER_KEY", "MPESA_CONSUMER_SECRET", "MPESA_PASSKEY", "MPESA_BUSINESS_SHORTCODE", "MPESA_CALLBACK_URL"].every((k) => env[k]);
  const auth = requireProductAuth("compliance", { env });

  return async function plugin(app) {
    app.post("/stkpush", { preHandler: auth, config: { rateLimit: { max: 5, timeWindow: "1 minute" } } }, async (req, reply) => {
      if (!configured()) return reply.code(503).send({ error: "MPESA_NOT_CONFIGURED", message: "M-Pesa payments are not configured." });
      const phone = String(req.body?.phoneNumber || "").replace(/\D/g, "").replace(/^0/, "254");
      const amount = Math.round(Number(req.body?.amount));
      if (!/^2547\d{8}$|^2541\d{8}$/.test(phone)) return reply.code(400).send({ error: "INVALID_PHONE", message: "Use a Safaricom number like 0712345678." });
      if (!Number.isFinite(amount) || amount < 1 || amount > 250000) return reply.code(400).send({ error: "INVALID_AMOUNT", message: "Amount must be between 1 and 250,000 KES." });
      try {
        const token = await accessToken(env, fetchImpl);
        const { timestamp, password: pw } = password(env);
        const res = await fetchImpl(`${BASE(env)}/mpesa/stkpush/v1/processrequest`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            BusinessShortCode: env.MPESA_BUSINESS_SHORTCODE, Password: pw, Timestamp: timestamp,
            TransactionType: "CustomerPayBillOnline", Amount: amount, PartyA: phone, PartyB: env.MPESA_BUSINESS_SHORTCODE,
            PhoneNumber: phone, CallBackURL: env.MPESA_CALLBACK_URL,
            AccountReference: String(req.body?.accountReference || "KRA-CUSTOMS").slice(0, 12), TransactionDesc: "Customs duty",
          }),
        });
        return reply.code(res.ok ? 200 : 502).send(await res.json());
      } catch (err) {
        req.log.error(err);
        return reply.code(502).send({ error: "MPESA_FAILED", message: "Could not reach M-Pesa. Try again." });
      }
    });

    app.get("/query", { preHandler: auth }, async (req, reply) => {
      if (!configured()) return reply.code(503).send({ error: "MPESA_NOT_CONFIGURED" });
      const id = String(req.query?.checkoutRequestId || "");
      if (!id) return reply.code(400).send({ error: "MISSING_ID" });
      try {
        const token = await accessToken(env, fetchImpl);
        const { timestamp, password: pw } = password(env);
        const res = await fetchImpl(`${BASE(env)}/mpesa/stkpushquery/v1/query`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ BusinessShortCode: env.MPESA_BUSINESS_SHORTCODE, Password: pw, Timestamp: timestamp, CheckoutRequestID: id }),
        });
        const data = await res.json();
        // Shape expected by the Compliance workspace: COMPLETED | FAILED | PENDING.
        const status = data.ResultCode === "0" ? "COMPLETED" : data.ResultCode ? "FAILED" : "PENDING";
        return { status, mpesaReceiptNumber: data.MpesaReceiptNumber || null, resultDesc: data.ResultDesc || null };
      } catch (err) {
        req.log.error(err);
        return reply.code(502).send({ error: "MPESA_FAILED" });
      }
    });

    app.post("/callback", async (req) => {
      req.log.info({ mpesa: req.body?.Body?.stkCallback?.ResultCode }, "mpesa callback");
      return { ResultCode: 0, ResultDesc: "Accepted" };
    });
  };
}
