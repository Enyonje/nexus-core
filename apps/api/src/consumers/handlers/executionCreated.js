import { runExecution } from "../../execution/runner.js";

export async function handleExecutionCreated(event) {
  const { executionId } = event.payload;

  // fire-and-forget
  runExecution(executionId);
}
