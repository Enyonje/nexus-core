CREATE TABLE "business_profiles" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "business_name" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "team_size" TEXT NOT NULL,
    "website" TEXT,
    "goals" JSONB NOT NULL DEFAULT '[]',
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "business_profiles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "business_profiles_org_id_fkey"
        FOREIGN KEY ("org_id") REFERENCES "organizations"("id")
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "business_profiles_updated_by_fkey"
        FOREIGN KEY ("updated_by") REFERENCES "users"("id")
        ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "business_profiles_org_id_key"
ON "business_profiles"("org_id");

CREATE INDEX "business_profiles_industry_idx"
ON "business_profiles"("industry");


CREATE TABLE "business_activities" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "user_id" TEXT,
    "event_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "source" TEXT NOT NULL,
    "department" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "business_activities_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "business_activities_org_id_fkey"
        FOREIGN KEY ("org_id") REFERENCES "organizations"("id")
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "business_activities_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id")
        ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "business_activities_org_id_created_at_idx"
ON "business_activities"("org_id", "created_at");

CREATE INDEX "business_activities_org_id_department_idx"
ON "business_activities"("org_id", "department");
