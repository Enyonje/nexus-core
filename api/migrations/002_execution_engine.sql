-- Goals (intent)
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  submitted_by UUID REFERENCES users(id) ON DELETE CASCADE,
  goal_type TEXT NOT NULL,
  goal_payload JSONB NOT NULL,
  status TEXT CHECK (status IN ('pending', 'running', 'completed', 'failed', 'blocked')) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT now()
);

-- Executions (immutable runs)
CREATE TABLE IF NOT EXISTS executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  status TEXT CHECK (status IN ('running', 'completed', 'failed', 'blocked')) NOT NULL,
  started_at TIMESTAMP DEFAULT now(),
  ended_at TIMESTAMP
);

-- Execution plans (DAG)
CREATE TABLE IF NOT EXISTS execution_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  execution_id UUID REFERENCES executions(id) ON DELETE CASCADE,
  plan_version INTEGER NOT NULL,
  plan_dag JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);