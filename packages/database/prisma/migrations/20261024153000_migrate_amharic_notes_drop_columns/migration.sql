-- 1. Migrate title_am and body_am from existing NOTE items into separate AMHARIC_NOTE items
INSERT INTO "contents" (
  "id",
  "topic_id",
  "kind",
  "version",
  "status",
  "title",
  "body",
  "is_free_trial",
  "published_at",
  "created_at",
  "updated_at"
)
SELECT 
  gen_random_uuid(),
  c."topic_id",
  'AMHARIC_NOTE'::"ContentKind",
  c."version",
  c."status",
  COALESCE(NULLIF(c."title_am", ''), c."title", ''),
  COALESCE(c."body_am", c."body", ''),
  c."is_free_trial",
  c."published_at",
  c."created_at",
  c."updated_at"
FROM "contents" c
WHERE c."kind" = 'NOTE'
  AND (c."title_am" IS NOT NULL OR c."body_am" IS NOT NULL)
  AND NOT EXISTS (
    SELECT 1 FROM "contents" a 
    WHERE a."topic_id" = c."topic_id" 
      AND a."kind" = 'AMHARIC_NOTE' 
      AND a."version" = c."version"
  );

-- 2. Populate title and body for English NOTE items from title_en / body_en if title/body were empty
UPDATE "contents"
SET 
  "title" = CASE WHEN "title" = '' OR "title" IS NULL THEN COALESCE("title_en", '') ELSE "title" END,
  "body" = CASE WHEN "body" = '' OR "body" IS NULL THEN COALESCE("body_en", '') ELSE "body" END
WHERE "kind" = 'NOTE';

-- 3. Drop columns title_am, body_en, body_am from contents
ALTER TABLE "contents" DROP COLUMN IF EXISTS "title_am";
ALTER TABLE "contents" DROP COLUMN IF EXISTS "body_en";
ALTER TABLE "contents" DROP COLUMN IF EXISTS "body_am";
