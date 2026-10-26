-- 1. Alter PublicationStatus enum to include IN_REVIEW
ALTER TYPE "PublicationStatus" ADD VALUE IF NOT EXISTS 'IN_REVIEW';

-- 2. Create admin_users table
CREATE TABLE IF NOT EXISTS "admin_users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT NOT NULL DEFAULT '',
    "last_name" TEXT NOT NULL DEFAULT '',
    "admin_role" "AdminRole" NOT NULL DEFAULT 'SUPER_ADMIN',
    "totp_secret" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "admin_users_email_key" ON "admin_users"("email");
CREATE INDEX IF NOT EXISTS "admin_users_admin_role_idx" ON "admin_users"("admin_role");
CREATE INDEX IF NOT EXISTS "admin_users_is_active_idx" ON "admin_users"("is_active");

-- 3. Move existing admin rows from students table to admin_users table
INSERT INTO "admin_users" ("id", "email", "password_hash", "first_name", "last_name", "admin_role", "is_active", "created_at", "updated_at")
SELECT 
    s."id",
    COALESCE(s."email", 'admin_' || s."id" || '@mastara.app'),
    s."password_hash",
    s."first_name",
    s."last_name",
    COALESCE(s."admin_role", 'SUPER_ADMIN'),
    CASE WHEN s."status" = 'ACTIVE' THEN true ELSE false END,
    s."created_at",
    s."updated_at"
FROM "students" s
WHERE s."role" = 'ADMIN' OR s."admin_role" IS NOT NULL
ON CONFLICT ("id") DO NOTHING;

-- 4. Repoint admin_scopes foreign key from students to admin_users
ALTER TABLE "admin_scopes" DROP CONSTRAINT IF EXISTS "admin_scopes_admin_id_fkey";

DELETE FROM "admin_scopes" WHERE "admin_id" NOT IN (SELECT "id" FROM "admin_users");

ALTER TABLE "admin_scopes" ADD CONSTRAINT "admin_scopes_admin_id_fkey" 
    FOREIGN KEY ("admin_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 5. Delete admin rows from students table
DELETE FROM "students" WHERE "role" = 'ADMIN';

-- 6. Drop serial autoincrement sequence on student_number
ALTER TABLE "students" ALTER COLUMN "student_number" DROP DEFAULT;
DROP SEQUENCE IF EXISTS "students_student_number_seq";

-- 7. Create counters table in migration
CREATE TABLE IF NOT EXISTS "counters" (
    "name" VARCHAR(64) PRIMARY KEY,
    "value" BIGINT NOT NULL DEFAULT 0
);

INSERT INTO "counters" ("name", "value") VALUES ('student_ms_code', 0) ON CONFLICT ("name") DO NOTHING;
UPDATE "counters" 
SET "value" = GREATEST("value", (SELECT COALESCE(MAX("student_number"), 0) FROM "students"))
WHERE "name" = 'student_ms_code';

-- 8. Add maker-checker columns (authored_by, reviewed_by)
ALTER TABLE "contents" ADD COLUMN IF NOT EXISTS "authored_by" UUID, ADD COLUMN IF NOT EXISTS "reviewed_by" UUID;
ALTER TABLE "modules" ADD COLUMN IF NOT EXISTS "authored_by" UUID, ADD COLUMN IF NOT EXISTS "reviewed_by" UUID;
ALTER TABLE "exams" ADD COLUMN IF NOT EXISTS "authored_by" UUID, ADD COLUMN IF NOT EXISTS "reviewed_by" UUID;
ALTER TABLE "exam_sets" ADD COLUMN IF NOT EXISTS "authored_by" UUID, ADD COLUMN IF NOT EXISTS "reviewed_by" UUID;
ALTER TABLE "coc_sets" ADD COLUMN IF NOT EXISTS "authored_by" UUID, ADD COLUMN IF NOT EXISTS "reviewed_by" UUID;
