// Backward-compatible export. The canonical webhook handler lives alongside
// billing/subscription synchronization so signature verification and entitlement
// updates cannot drift into separate implementations.
export { stripeWebhookPlugin as default, stripeWebhookPlugin, stripeWebhookPlugin as webhookRoutes } from "./billingRoutes.js";
