CREATE TABLE IF NOT EXISTS event_permissions (
  event_type TEXT,
  role TEXT,
  PRIMARY KEY (event_type, role)
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  role TEXT NOT NULL DEFAULT 'user',
  subscription_id INTEGER REFERENCES subscriptions(id)
);

-- Roles table (optional, for extensibility)
CREATE TABLE IF NOT EXISTS roles (
  name TEXT PRIMARY KEY,
  description TEXT
);

-- Subscriptions table (monetization tiers)
CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  stripe_price_id TEXT,
  features JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Stripe customer mapping
CREATE TABLE IF NOT EXISTS stripe_customers (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL,
  PRIMARY KEY (user_id)
);

-- Stripe subscription mapping
CREATE TABLE IF NOT EXISTS stripe_subscriptions (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT NOT NULL,
  status TEXT,
  current_period_end TIMESTAMP,
  PRIMARY KEY (user_id)
);

-- Password resets table
CREATE TABLE IF NOT EXISTS password_resets (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  PRIMARY KEY (user_id)
);
