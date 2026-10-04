// apps/api/supportops/routes/templates.js

/**
 * Validates template parameter count and array format
 */
export function validateParams(expectedCount, params = []) {
    if (!Array.isArray(params)) {
        return { ok: false, error: "Params must be an array" };
    }
    if (params.length !== expectedCount) {
        return {
            ok: false,
            error: `Template requires ${expectedCount} parameter(s), but received ${params.length}`,
        };
    }
    return { ok: true, params };
}

/**
 * Replaces placeholders in template body (e.g., {{1}}, {{2}}) with positional parameters
 */
export function render(body = "", params = []) {
    let output = body;
    params.forEach((param, index) => {
        output = output.replace(new RegExp(`\\{\\{${index + 1}\\}\\}`, "g"), param);
    });
    return output;
}

/**
 * Parses and summarizes WhatsApp message templates returned by Meta Graph API
 */
export function summarize(templates = []) {
    return templates.map((tpl) => {
        const bodyComp = tpl.components?.find((c) => c.type === "BODY") || {};
        const paramMatches = (bodyComp.text || "").match(/\{\{\d+\}\}/g);
        const paramCount = paramMatches ? new Set(paramMatches).size : 0;

        return {
            name: tpl.name,
            language: tpl.language,
            status: tpl.status,
            category: tpl.category,
            body: bodyComp.text || "",
            paramCount,
            supported: tpl.status === "APPROVED",
        };
    });
}

/**
 * Fastify Plugin Route Registration (optional endpoint exposure)
 */
export default async function templatesRoutes(fastify, options) {
    fastify.get("/", async (request, reply) => {
        return reply.send({ success: true, message: "Templates helper module loaded" });
    });
}