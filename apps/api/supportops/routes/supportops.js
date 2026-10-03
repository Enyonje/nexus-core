import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Relative path to supportops route files
const SUPPORTOPS_ROUTES_PATH = path.resolve(__dirname, '../../supportops/routes');

export default async function supportOpsRoutesPlugin(fastify, options) {
    // Register individual route modules with clear URL prefixes
    await fastify.register(import(`${SUPPORTOPS_ROUTES_PATH}/auth.js`), { prefix: '/auth' });
    await fastify.register(import(`${SUPPORTOPS_ROUTES_PATH}/ai.js`), { prefix: '/ai' });
    await fastify.register(import(`${SUPPORTOPS_ROUTES_PATH}/aiRoutes.js`), { prefix: '/ai-agent' });
    await fastify.register(import(`${SUPPORTOPS_ROUTES_PATH}/aiReviewRoutes.js`), { prefix: '/ai-review' });
    await fastify.register(import(`${SUPPORTOPS_ROUTES_PATH}/tickets.js`), { prefix: '/tickets' });
    await fastify.register(import(`${SUPPORTOPS_ROUTES_PATH}/incidents.js`), { prefix: '/incidents' });
    await fastify.register(import(`${SUPPORTOPS_ROUTES_PATH}/orgAnalyticsRoutes.js`), { prefix: '/analytics' });
    await fastify.register(import(`${SUPPORTOPS_ROUTES_PATH}/users.js`), { prefix: '/users' });
    await fastify.register(import(`${SUPPORTOPS_ROUTES_PATH}/stripeWebhook.js`), { prefix: '/billing' });
}