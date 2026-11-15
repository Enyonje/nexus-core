-- src/db/schema.sql
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    subscription TEXT DEFAULT 'free',
    ai_used INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'running',
    name TEXT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP,
    result JSONB,
    error TEXT
);

CREATE TABLE IF NOT EXISTS steps (
    id TEXT PRIMARY KEY,
    execution_id UUID REFERENCES executions(id) ON DELETE CASCADE,
    name TEXT,
    status TEXT,
    result JSONB,
    error TEXT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);