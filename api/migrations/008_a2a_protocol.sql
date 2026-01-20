BEGIN;

-- Agent registry
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  agent_type TEXT NOT NULL,
  capabilities JSONB,
  created_at TIMESTAMP DEFAULT now()
);

-- Agent-to-Agent contracts
CREATE TABLE IF NOT EXISTS agent_contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  execution_id UUID REFERENCES executions(id) ON DELETE CASCADE,
  requester_agent UUID REFERENCES agents(id) ON DELETE CASCADE,
  responder_agent UUID REFERENCES agents(id) ON DELETE CASCADE,
  contract JSONB NOT NULL,
  accepted BOOLEAN,
  created_at TIMESTAMP DEFAULT now()
);

-- Agent messages (A2A communication)
CREATE TABLE IF NOT EXISTS agent_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID REFERENCES agent_contracts(id) ON DELETE CASCADE,
  sender_agent UUID REFERENCES agents(id) ON DELETE CASCADE,
  message JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contract_execution ON agent_contracts(execution_id);
CREATE INDEX IF NOT EXISTS idx_messages_contract ON agent_messages(contract_id);

COMMIT;