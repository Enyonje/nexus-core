import { prisma } from "../db.js";
import { runAgent, runWorkflow } from "./engine.js";

let busy = false;

export async function processAutomations(log = console) {
  if (busy) return;

  busy = true;

  try {
    const dueAutomations = await prisma.automation.findMany({
      where: {
        isActive: true,
        nextRunAt: {
          lte: new Date(),
        },
      },
      orderBy: {
        nextRunAt: "asc",
      },
      take: 5,
    });

    for (const automation of dueAutomations) {
      try {
        let result;

        if (automation.kind === "WORKFLOW") {
          result = await runWorkflow({
            workspaceId: automation.workspaceId,
            workflow: automation.target,
            task: automation.task,
            context: automation.context ?? "",
          });
        } else {
          result = await runAgent({
            workspaceId: automation.workspaceId,
            agent: automation.target,
            task: automation.task,
            context: automation.context ?? "",
          });
        }

        const nextRunAt = new Date(
          Date.now() + automation.intervalMinutes * 60 * 1000
        );

        await prisma.automation.update({
          where: { id: automation.id },
          data: {
            lastRunAt: new Date(),
            lastResult:
              automation.kind === "WORKFLOW"
                ? result.finalOutput ?? JSON.stringify(result)
                : result.result ?? JSON.stringify(result),
            nextRunAt,
          },
        });

        log.info?.(
          { automationId: automation.id },
          "Automation executed successfully"
        );
      } catch (error) {
        log.error?.(
          {
            automationId: automation.id,
            error: error.message,
          },
          "Automation execution failed"
        );

        await prisma.automation.update({
          where: { id: automation.id },
          data: {
            lastRunAt: new Date(),
            lastResult: `FAILED: ${error.message}`,
            nextRunAt: new Date(
              Date.now() + automation.intervalMinutes * 60 * 1000
            ),
          },
        }).catch(updateError => {
          log.error?.(updateError, "Could not update automation status");
        });
      }
    }
  } catch (error) {
    log.error?.(error, "Automation worker failed");
  } finally {
    busy = false;
  }
}