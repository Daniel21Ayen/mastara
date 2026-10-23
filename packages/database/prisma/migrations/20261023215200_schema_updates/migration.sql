
-- CreateEnum
CREATE TYPE "QuestionKind" AS ENUM ('MID', 'FINAL', 'MOCK', 'COC');

-- CreateEnum
CREATE TYPE "ExamSetKind" AS ENUM ('QUIZ1', 'QUIZ2', 'QUIZ3', 'MID', 'FINAL', 'MOCK', 'COC');

-- CreateEnum
CREATE TYPE "ContentKind" AS ENUM ('MODULE', 'NOTE', 'AMHARIC_NOTE');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'EXAM_RESULT';

-- AlterEnum
ALTER TYPE "QuestionType" ADD VALUE 'BLANK';

-- AlterEnum
ALTER TYPE "TicketStatus" ADD VALUE 'ANSWERED';

-- DropForeignKey
ALTER TABLE "questions" DROP CONSTRAINT "questions_course_id_fkey";

-- DropIndex
DROP INDEX "contents_topic_id_version_key";

-- AlterTable
ALTER TABLE "attempts" ADD COLUMN     "exam_set_id" UUID;

-- AlterTable
ALTER TABLE "contents" ADD COLUMN     "asset_key" TEXT,
ADD COLUMN     "body" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "kind" "ContentKind" NOT NULL DEFAULT 'NOTE',
ADD COLUMN     "title" TEXT NOT NULL DEFAULT '',
ALTER COLUMN "title_en" DROP NOT NULL,
ALTER COLUMN "title_am" DROP NOT NULL,
ALTER COLUMN "body_en" DROP NOT NULL,
ALTER COLUMN "body_am" DROP NOT NULL;

-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "color" TEXT NOT NULL DEFAULT '#1a56db',
ADD COLUMN     "free_trial_items" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "icon" TEXT NOT NULL DEFAULT 'book',
ADD COLUMN     "university_id" UUID;

-- AlterTable
ALTER TABLE "device_bindings" ADD COLUMN     "push_token" TEXT;

-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "answer_description" TEXT,
ADD COLUMN     "body" TEXT,
ADD COLUMN     "description_asset_key" TEXT,
ADD COLUMN     "kind" "QuestionKind" NOT NULL DEFAULT 'MID',
ADD COLUMN     "program_id" UUID,
ADD COLUMN     "question_number" SERIAL NOT NULL,
ADD COLUMN     "semester_id" UUID,
ADD COLUMN     "status" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "stream" "Stream",
ADD COLUMN     "university_id" UUID,
ADD COLUMN     "year" INTEGER,
ALTER COLUMN "course_id" DROP NOT NULL,
ALTER COLUMN "prompt_en" SET DEFAULT '';

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "push_token" TEXT,
ADD COLUMN     "student_code" TEXT,
ADD COLUMN     "student_number" SERIAL NOT NULL;

-- AlterTable
ALTER TABLE "support_tickets" ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'GENERAL',
ADD COLUMN     "priority" TEXT NOT NULL DEFAULT 'NORMAL';

-- CreateTable
CREATE TABLE "exam_sets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "set_code" TEXT,
    "title" TEXT NOT NULL,
    "kind" "ExamSetKind" NOT NULL,
    "university_id" UUID,
    "program_id" UUID,
    "semester_id" UUID,
    "course_id" UUID,
    "stream" "Stream",
    "year" INTEGER,
    "duration_min" INTEGER NOT NULL DEFAULT 60,
    "is_free_trial" BOOLEAN NOT NULL DEFAULT false,
    "shuffle" BOOLEAN NOT NULL DEFAULT false,
    "feedback_mode" TEXT DEFAULT 'IMMEDIATE',
    "result_policy" TEXT DEFAULT 'IMMEDIATE',
    "sample_question_count" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "exam_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_set_questions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "exam_set_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "points" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "exam_set_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broadcasts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'INFO',
    "action_url" TEXT,
    "sent_by" TEXT NOT NULL DEFAULT 'Admin',
    "recipient_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "broadcasts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exam_sets_set_code_key" ON "exam_sets"("set_code");

-- CreateIndex
CREATE INDEX "exam_sets_kind_status_idx" ON "exam_sets"("kind", "status");

-- CreateIndex
CREATE INDEX "exam_sets_university_id_course_id_year_idx" ON "exam_sets"("university_id", "course_id", "year");

-- CreateIndex
CREATE INDEX "exam_set_questions_exam_set_id_sort_order_idx" ON "exam_set_questions"("exam_set_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "exam_set_questions_exam_set_id_question_id_key" ON "exam_set_questions"("exam_set_id", "question_id");

-- CreateIndex
CREATE INDEX "broadcasts_created_at_idx" ON "broadcasts"("created_at");

-- CreateIndex
CREATE INDEX "attempts_exam_set_id_idx" ON "attempts"("exam_set_id");

-- CreateIndex
CREATE INDEX "contents_kind_status_idx" ON "contents"("kind", "status");

-- CreateIndex
CREATE UNIQUE INDEX "contents_topic_id_kind_version_key" ON "contents"("topic_id", "kind", "version");

-- CreateIndex
CREATE INDEX "courses_university_id_idx" ON "courses"("university_id");

-- CreateIndex
CREATE INDEX "questions_question_number_idx" ON "questions"("question_number");

-- CreateIndex
CREATE INDEX "questions_kind_status_idx" ON "questions"("kind", "status");

-- CreateIndex
CREATE INDEX "questions_university_id_program_id_semester_id_stream_idx" ON "questions"("university_id", "program_id", "semester_id", "stream");

-- CreateIndex
CREATE UNIQUE INDEX "students_student_number_key" ON "students"("student_number");

-- CreateIndex
CREATE UNIQUE INDEX "students_student_code_key" ON "students"("student_code");

-- CreateIndex
CREATE INDEX "support_tickets_status_created_at_idx" ON "support_tickets"("status", "created_at");

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_university_id_fkey" FOREIGN KEY ("university_id") REFERENCES "universities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_semester_id_fkey" FOREIGN KEY ("semester_id") REFERENCES "semesters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_exam_set_id_fkey" FOREIGN KEY ("exam_set_id") REFERENCES "exam_sets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_sets" ADD CONSTRAINT "exam_sets_university_id_fkey" FOREIGN KEY ("university_id") REFERENCES "universities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_sets" ADD CONSTRAINT "exam_sets_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_sets" ADD CONSTRAINT "exam_sets_semester_id_fkey" FOREIGN KEY ("semester_id") REFERENCES "semesters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_sets" ADD CONSTRAINT "exam_sets_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_set_questions" ADD CONSTRAINT "exam_set_questions_exam_set_id_fkey" FOREIGN KEY ("exam_set_id") REFERENCES "exam_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_set_questions" ADD CONSTRAINT "exam_set_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_university_id_fkey" FOREIGN KEY ("university_id") REFERENCES "universities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

