CREATE TABLE IF NOT EXISTS ai_decisions (
  id SERIAL PRIMARY KEY,
  decision TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL
);
