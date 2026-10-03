import { db } from "../db/db.js";
import { publishEvent } from "../events/publish.js";

export async function pauseExecutionForApproval(executionId, stepId, reason) {
    await db.query(
        `UPDATE executions SET status = 'paused', updated_at = NOW() WHERE id = $1`,
        [executionId]
    );

    await db.query(
        `UPDATE execution_steps SET status = 'awaiting_approval', reasoning = $2 WHERE id = $1`,
        [stepId, reason]
    );

    await publishEvent({
        executionId,
        event: "execution_paused_for_approval",
        stepId,
        reason,
    });
}

export async function resumeExecution(executionId, stepId, approvedByUserId, decision = "approved") {
    if (decision !== "approved") {
        await db.query(
            `UPDATE executions SET status = 'rejected', finished_at = NOW() WHERE id = $1`,
            [executionId]
        );
        return { status: "rejected" };
    }

    await db.query(
        `UPDATE executions SET status = 'running', updated_at = NOW() WHERE id = $1`,
        [executionId]
    );

    await db.query(
        `UPDATE execution_steps SET status = 'running', updated_at = NOW() WHERE id = $1`,
        [stepId]
    );

    await publishEvent({
        executionId,
        event: "execution_resumed",
        approvedBy: approvedByUserId,
    });

    return { status: "resumed" };
}