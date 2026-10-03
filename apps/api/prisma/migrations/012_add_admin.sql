-- Add missing columns safely
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription TEXT DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';

-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Seed admin account
INSERT INTO users (id, email, password_hash, subscription, role, timezone)
VALUES (
  gen_random_uuid(),
  'admin@example.com',
  crypt('SuperSecurePassword!', gen_salt('bf')),
  'enterprise',
  'admin',
  'UTC'
)
ON CONFLICT (email) DO NOTHING;