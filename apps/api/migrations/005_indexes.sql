BEGIN;

CREATE INDEX IF NOT EXISTS idx_users_org_id ON users(org_id);
CREATE INDEX IF NOT EXISTS idx_goals_org_id ON goals(org_id);
CREATE INDEX IF NOT EXISTS idx_executions_goal_id ON executions(goal_id);
CREATE INDEX IF NOT EXISTS idx_tasks_execution_id ON tasks(execution_id);
CREATE INDEX IF NOT EXISTS idx_agent_actions_task_id ON agent_actions(task_id);
CREATE INDEX IF NOT EXISTS idx_sentinel_execution_id ON sentinel_decisions(execution_id);
CREATE INDEX IF NOT EXISTS idx_outcomes_execution_id ON outcomes(execution_id);
CREATE INDEX IF NOT EXISTS idx_billing_org_id ON billing_events(org_id);

COMMIT;