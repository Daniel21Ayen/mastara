-- 1. Backfill existing questions with consecutive display_number per set (topic/course) in creation order
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY COALESCE(topic_id, course_id)
    ORDER BY created_at ASC, id ASC
  ) as seq
  FROM questions
)
UPDATE questions q
SET display_number = numbered.seq
FROM numbered
WHERE q.id = numbered.id;

-- 2. Enforce NOT NULL and default on display_number
ALTER TABLE "questions" ALTER COLUMN "display_number" SET DEFAULT 1;
ALTER TABLE "questions" ALTER COLUMN "display_number" SET NOT NULL;

-- 3. Add unique constraint and index on set and display_number
CREATE UNIQUE INDEX IF NOT EXISTS "questions_course_id_topic_id_display_number_key" 
ON "questions" ("course_id", "topic_id", "display_number");

CREATE UNIQUE INDEX IF NOT EXISTS "questions_set_display_number_idx"
ON "questions" (COALESCE("topic_id", "course_id"), "display_number");

-- 4. Initialize per-set counters from max display_number
INSERT INTO "counters" ("name", "value")
SELECT 'question_num_' || COALESCE(topic_id, course_id)::text, MAX(display_number)
FROM questions
WHERE display_number IS NOT NULL
GROUP BY COALESCE(topic_id, course_id)
ON CONFLICT ("name") DO UPDATE SET "value" = GREATEST("counters"."value", EXCLUDED."value");
