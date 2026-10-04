// backend/routes/templateService.js  Loads this workspace's approved WhatsApp templates from Meta (cached 5 min).
// Templates are created and approved in WhatsApp Manager; the connected WhatsApp channel needs its
// "Business account ID" filled in (Admin > Channels).
import { prisma } from "../lib/deps.js";
import { decrypt } from "./channelsRoutes.js";
import { OutboundError } from "./outbound.js";
import { summarize } from "./templates.js";

const cache = new Map(); // orgId -> { exp, list }

export async function listTemplates(orgId) {
    const hit = cache.get(orgId);
    if (hit && hit.exp > Date.now()) return hit.list;

    const row = await prisma.channel.findFirst({ where: { org_id: orgId, key: "whatsapp", status: "connected" } });
    if (!row) throw new OutboundError("CHANNEL_NOT_CONNECTED", "WhatsApp is not connected for this workspace", 409);
    const waba = row.public_config?.businessAccountId;
    if (!waba) throw new OutboundError("NO_BUSINESS_ACCOUNT", "Add the WhatsApp Business account ID in Admin > Channels", 422);

    const { accessToken } = decrypt(row.config_enc);
    let res, data = {};
    try {
        res = await fetch(`https://graph.facebook.com/v20.0/${waba}/message_templates?fields=name,language,status,category,components&limit=100`, {
            headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(10000),
        });
        data = await res.json().catch(() => ({}));
    } catch {
        throw new OutboundError("PROVIDER_UNREACHABLE", "Could not reach WhatsApp. Please try again.", 502);
    }
    if (!res.ok) throw new OutboundError("PROVIDER_REJECTED", data.error?.message ?? "Could not load templates", 502);

    const list = summarize(data.data ?? []);
    cache.set(orgId, { exp: Date.now() + 5 * 60 * 1000, list });
    return list;
}