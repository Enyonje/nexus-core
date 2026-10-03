import { v4 as uuidv4 } from "uuid";
import { prisma } from "../config/prisma.js";

export async function auditLog(userId, action, meta = {}) {
    if (!userId) return;
    try {
        await prisma.authAudit.create({
            data: {
                id: uuidv4(),
                user_id: userId,
                action,
                details: meta,
                created_at: new Date(),
            },
        });
    } catch (err) {
        console.error("Audit log failed to write:", err);
    }
}