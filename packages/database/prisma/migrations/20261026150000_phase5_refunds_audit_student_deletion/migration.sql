-- Phase 5: Refunds, Audit Improvements, and 7-Day Student Data Deletion Process

-- 1. Create RefundStatus enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RefundStatus') THEN
        CREATE TYPE "RefundStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'PAID_OUT', 'ENTITLEMENT_REVOKED');
    END IF;
END $$;

-- 2. Create refunds table
CREATE TABLE IF NOT EXISTS "refunds" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'REQUESTED',
    "requested_by" UUID NOT NULL,
    "reviewed_by" UUID,
    "decision_reason" TEXT,
    "payout_reference" TEXT,
    "paid_out_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "refunds_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "refunds_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "refunds_order_id_idx" ON "refunds"("order_id");
CREATE INDEX IF NOT EXISTS "refunds_student_id_idx" ON "refunds"("student_id");
CREATE INDEX IF NOT EXISTS "refunds_status_created_at_idx" ON "refunds"("status", "created_at");

-- 3. Student 7-day data deletion process fields
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "deletion_requested_at" TIMESTAMPTZ(6);
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "scheduled_deletion_at" TIMESTAMPTZ(6);
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "deletion_reason" TEXT;
CREATE INDEX IF NOT EXISTS "students_scheduled_deletion_at_idx" ON "students"("scheduled_deletion_at");

-- 4. Audit Log scope column
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "scope" TEXT;
