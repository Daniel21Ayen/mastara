-- packages/database/prisma/migrations/20261025180000_admin_roles_and_scopes/migration.sql
-- Step 1: Create AdminRole Enum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'ACADEMIC_ADMIN', 'OPERATIONS_ADMIN');

-- Step 2: Alter students table to add admin_role
ALTER TABLE "students" ADD COLUMN "admin_role" "AdminRole";

-- Step 3: Set every existing admin to SUPER_ADMIN so nobody is locked out
UPDATE "students" SET "admin_role" = 'SUPER_ADMIN' WHERE "role" = 'ADMIN';

-- Step 4: Add database check so the two columns cannot disagree
ALTER TABLE "students" ADD CONSTRAINT "check_admin_role_agreement" CHECK (("role" = 'ADMIN') = ("admin_role" IS NOT NULL));

-- Step 5: CreateIndex on students.admin_role
CREATE INDEX "students_admin_role_idx" ON "students"("admin_role");

-- Step 6: CreateTable admin_scopes
CREATE TABLE "admin_scopes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "admin_id" UUID NOT NULL,
    "university_id" UUID,
    "program_id" UUID,
    "course_id" UUID,

    CONSTRAINT "admin_scopes_pkey" PRIMARY KEY ("id")
);

-- Step 7: CreateIndex on admin_scopes.admin_id
CREATE INDEX "admin_scopes_admin_id_idx" ON "admin_scopes"("admin_id");

-- Step 8: AddForeignKey for admin_scopes
ALTER TABLE "admin_scopes" ADD CONSTRAINT "admin_scopes_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 9: AlterTable audit_logs to record admin role subtype
ALTER TABLE "audit_logs" ADD COLUMN "actor_admin_role" "AdminRole";
