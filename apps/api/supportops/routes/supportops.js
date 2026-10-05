import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve route directory path across Linux (Render) and Windows/WSL environments
const SUPPORTOPS_ROUTES_PATH = path.resolve(__dirname, '../../supportops/routes');

// Helper to safely format file paths for ES module dynamic imports
const getRouteUrl = (fileName) => pathToFileURL(path.join(SUPPORTOPS_ROUTES_PATH, fileName)).href;

export default async function supportOpsRoutesPlugin(fastify, options) {
    // 1. Hook to extract query token for SSE EventSource streams and map to Authorization header
    fastify.addHook('onRequest', async (request, reply) => {
        if (request.query && request.query.token && !request.headers.authorization) {
            request.headers.authorization = `Bearer ${request.query.token}`;
        }
    });

    // 2. Import dynamic route modules
    const authRoutes = await import(getRouteUrl('auth.js'));
    const aiRoutes = await import(getRouteUrl('ai.js'));
    const aiAgentRoutes = await import(getRouteUrl('aiRoutes.js'));
    const aiReviewRoutes = await import(getRouteUrl('aiReviewRoutes.js'));
    const ticketsRoutes = await import(getRouteUrl('tickets.js'));
    const incidentsRoutes = await import(getRouteUrl('incidents.js'));
    const orgAnalyticsRoutes = await import(getRouteUrl('orgAnalyticsRoutes.js'));
    const usersRoutes = await import(getRouteUrl('users.js'));
    const stripeWebhookRoutes = await import(getRouteUrl('stripeWebhook.js'));

    // 3. Register route modules with defined URL prefixes
    await fastify.register(authRoutes.default || authRoutes, { prefix: '/auth' });
    await fastify.register(aiRoutes.default || aiRoutes, { prefix: '/ai' });
    await fastify.register(aiAgentRoutes.default || aiAgentRoutes, { prefix: '/ai-agent' });
    await fastify.register(aiReviewRoutes.default || aiReviewRoutes, { prefix: '/ai-review' });
    await fastify.register(ticketsRoutes.default || ticketsRoutes, { prefix: '/tickets' });
    await fastify.register(incidentsRoutes.default || incidentsRoutes, { prefix: '/incidents' });
    await fastify.register(orgAnalyticsRoutes.default || orgAnalyticsRoutes, { prefix: '/analytics' });
    await fastify.register(usersRoutes.default || usersRoutes, { prefix: '/users' });
    await fastify.register(stripeWebhookRoutes.default || stripeWebhookRoutes, { prefix: '/billing' });
}