import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

/**
 * Dynamically scans and registers Fastify route plugins from a directory.
 * Prevents duplicated route registrations and normalizes ESM default/named exports.
 * 
 * @param {import('fastify').FastifyInstance} fastify 
 * @param {Object} options 
 * @param {string} options.dirPath - Absolute path to routes folder
 * @param {string} options.basePrefix - API prefix (e.g. '/api/v1')
 */
export async function loadRoutes(fastify, { dirPath, basePrefix = "/api/v1" }) {
    if (!fs.existsSync(dirPath)) return;

    const files = fs.readdirSync(dirPath);
    const registeredPrefixes = new Set();

    for (const file of files) {
        // Only load Javascript or Typescript files, ignore tests or hidden files
        if (!file.endsWith(".js") && !file.endsWith(".ts")) continue;
        if (file.startsWith("_") || file.includes(".test.")) continue;

        const filePath = path.join(dirPath, file);
        const fileUrl = pathToFileURL(filePath).href;

        try {
            const module = await import(fileUrl);

            // Resolve route handler: default export > named export matching file name > first exported function
            let routePlugin = module.default;

            if (!routePlugin) {
                const routeName = path.basename(file, path.extname(file));
                const possibleName = `${routeName}Routes`;

                routePlugin = module[possibleName] || module[routeName] || Object.values(module).find(v => typeof v === "function");
            }

            if (typeof routePlugin !== "function") {
                fastify.log.warn(`[Route Loader] Skipping ${file}: No valid plugin function exported.`);
                continue;
            }

            // Infer route prefix from filename (e.g., ai.js -> /api/v1/supportops/ai)
            const routeSlug = path.basename(file, path.extname(file));
            const routePrefix = `${basePrefix}/${routeSlug}`;

            // Prevent duplicate route registrations
            if (registeredPrefixes.has(routePrefix)) {
                fastify.log.warn(`[Route Loader] Skipping ${file}: Route prefix '${routePrefix}' is already registered.`);
                continue;
            }

            registeredPrefixes.add(routePrefix);

            // Register with Fastify
            await fastify.register(routePlugin, { prefix: routePrefix });
            fastify.log.info(`[Route Loader] Successfully registered: ${routePrefix} (${file})`);

        } catch (err) {
            fastify.log.error(`[Route Loader] Failed to load route ${file}: ${err.message}`);
            throw err; // Fail-fast on boot error
        }
    }
}