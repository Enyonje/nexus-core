-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  execution_id UUID REFERENCES executions(id) ON DELETE CASCADE,
  task_key TEXT NOT NULL,
  agent_type TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'running', 'success', 'failed', 'blocked')) NOT NULL,
  started_at TIMESTAMP,
  ended_at TIMESTAMP
);

-- Agent actions (append-only)
CREATE TABLE IF NOT EXISTS agent_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  agent_instance_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  input JSONB,
  output JSONB,
  reasoning_trace JSONB,
  created_at TIMESTAMP DEFAULT now()
);

-- Policies
CREATE TABLE IF NOT EXISTS policies (
  id TEXT PRIMARY KEY,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  policy_definition JSONB NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now()
);

-- Sentinel decisions
CREATE TABLE IF NOT EXISTS sentinel_decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  execution_id UUID REFERENCES executions(id) ON DELETE CASCADE,
  agent_action_id UUID REFERENCES agent_actions(id) ON DELETE CASCADE,
  decision TEXT CHECK (decision IN ('allow', 'block', 'escalate')) NOT NULL,
  policy_id TEXT REFERENCES policies(id) ON DELETE CASCADE,
  explanation TEXT,
  created_at TIMESTAMP DEFAULT now()
);