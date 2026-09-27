import { tracer } from "./tracing.js";

export async function traceSpan(spanName, attributes, fn) {
    return await tracer.startActiveSpan(spanName, async (span) => {
        try {
            span.setAttributes(attributes);
            const result = await fn(span);
            span.setStatus({ code: 1 }); // OK status
            return result;
        } catch (error) {
            span.recordException(error);
            span.setStatus({ code: 2, message: error.message }); // ERROR status
            throw error;
        } finally {
            span.end();
        }
    });
}