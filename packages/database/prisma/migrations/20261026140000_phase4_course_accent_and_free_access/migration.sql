-- AlterTable: Replace course color with accent and add free_access
ALTER TABLE "courses" DROP COLUMN IF EXISTS "color";
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "accent" TEXT NOT NULL DEFAULT 'blue';
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "free_access" BOOLEAN NOT NULL DEFAULT false;
