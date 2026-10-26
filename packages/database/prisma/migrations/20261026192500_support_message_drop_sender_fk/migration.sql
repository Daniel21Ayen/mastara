-- DropForeignKey to allow polymorphic sender (admin or student) on support_messages
ALTER TABLE "support_messages" DROP CONSTRAINT IF EXISTS "support_messages_sender_id_fkey";
