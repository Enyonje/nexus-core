// supportops.js
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPPORTOPS_ROUTES_PATH = path.resolve(__dirname, '../../supportops/routes');
const getRouteUrl = (fileName) => pathToFileURL(path.join(SUPPORTOPS_ROUTES_PATH, fileName)).href;

export default async function supportOpsRoutesPlugin(fastify, options) {
    // 1. Hook for SSE query tokens
    fastify.addHook('onRequest', async (request, reply) => {
        if (request.query && request.query.token && !request.headers.authorization) {
            request.headers.authorization = `Bearer ${request.query.token}`;
        }
    });

    // 2. Helper to load both ES default and named exports safely
    const registerModule = async (fileName, prefix) => {
        const mod = await import(getRouteUrl(fileName));
        const plugin = mod.default || Object.values(mod).find(v => typeof v === 'function');
        if (plugin) {
            await fastify.register(plugin, { prefix });
        }
    };

    // 3. Register route modules cleanly without collisions
    await registerModule('auth.js', '/auth');
    await registerModule('ai.js', '/ai');
    await registerModule('aiRoutes.js', '/ai-agent');
    await registerModule('aiReviewRoutes.js', '/ai-review');
    await registerModule('tickets.js', '/tickets');               // GET /api/v1/supportops/tickets
    await registerModule('channelsRoutes.js', '/channels');       // GET /api/v1/supportops/channels
    await registerModule('incidents.js', '/incidents');
    await registerModule('orgAnalyticsRoutes.js', '/analytics');
    await registerModule('users.js', '/users');
    await registerModule('stripeWebhook.js', '/billing');
}