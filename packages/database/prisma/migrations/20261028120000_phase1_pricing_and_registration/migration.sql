-- CreateEnum
CREATE TYPE "PricingMode" AS ENUM ('CALCULATED', 'FIXED');

-- DropIndex
DROP INDEX IF EXISTS "orders_claim_secret_hash_key";

-- DropIndex
DROP INDEX IF EXISTS "orders_pending_email_idx";

-- DropIndex
DROP INDEX IF EXISTS "orders_pending_phone_idx";

-- AlterTable
ALTER TABLE "admin_users" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "price_etb" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "orders" DROP COLUMN IF EXISTS "claimed_at",
DROP COLUMN IF EXISTS "pending_device_hash",
DROP COLUMN IF EXISTS "pending_device_platform";

-- AlterTable
ALTER TABLE "price_rules" ADD COLUMN IF NOT EXISTS "range_end" INTEGER,
ADD COLUMN IF NOT EXISTS "range_start" INTEGER;

-- AlterTable
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "discount_percent" DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS "fixed_price_etb" DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS "pricing_mode" "PricingMode" NOT NULL DEFAULT 'FIXED';

-- AlterTable
ALTER TABLE "refunds" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
CREATE SEQUENCE IF NOT EXISTS students_student_number_seq;
ALTER TABLE "students" ALTER COLUMN "student_number" SET DEFAULT nextval('students_student_number_seq');
ALTER SEQUENCE students_student_number_seq OWNED BY "students"."student_number";

ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "local_account_id" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "orders_claim_secret_hash_idx" ON "orders"("claim_secret_hash");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "students_local_account_id_key" ON "students"("local_account_id");
