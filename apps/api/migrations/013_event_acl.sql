-- Event ACL and billing/auth support.
-- Production users.id is TEXT. Keep all user references TEXT and preserve
-- existing users/subscription columns and records.

CREATE TABLE IF NOT EXISTS event_permissions (
  event_type TEXT NOT NULL,
  role TEXT NOT NULL,
  PRIMARY KEY (event_type, role)
);

CREATE TABLE IF NOT EXISTS roles (
  name TEXT PRIMARY KEY,
  description TEXT
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  stripe_price_id TEXT,
  features JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_id INTEGER;

-- Do not add a subscription FK unless the existing column types match.
DO $$
DECLARE
  user_subscription_type TEXT;
  subscription_pk_type TEXT;
BEGIN
  SELECT udt_name INTO user_subscription_type
  FROM information_schema.columns
  WHERE table_schema = current_schema()
    AND table_name = 'users'
    AND column_name = 'subscription_id';

  SELECT udt_name INTO subscription_pk_type
  FROM information_schema.columns
  WHERE table_schema = current_schema()
    AND table_name = 'subscriptions'
    AND column_name = 'id';

  IF user_subscription_type = subscription_pk_type
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint
       WHERE conname = 'users_subscription_id_fkey'
         AND conrelid = 'users'::regclass
     ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_subscription_id_fkey
      FOREIGN KEY (subscription_id) REFERENCES subscriptions(id);
  ELSE
    RAISE NOTICE 'Skipping users.subscription_id FK: existing type (%) does not match subscriptions.id type (%), or FK already exists',
      user_subscription_type, subscription_pk_type;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS stripe_customers (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL,
  PRIMARY KEY (user_id)
);

CREATE TABLE IF NOT EXISTS stripe_subscriptions (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT NOT NULL,
  status TEXT,
  current_period_end TIMESTAMP,
  PRIMARY KEY (user_id)
);

CREATE TABLE IF NOT EXISTS password_resets (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  PRIMARY KEY (user_id)
);
