#!/bin/bash
set -e

# Ensure DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL is not set"
  exit 1
fi

echo "🚀 Running migrations on $DATABASE_URL"

for file in apps/api/migrations/*.sql; do
  echo "📄 Applying $file..."
  psql "$DATABASE_URL" -f "$file"
done

echo "✅ All migrations applied"