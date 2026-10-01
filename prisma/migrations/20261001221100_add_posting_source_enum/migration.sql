-- The approved migration intentionally drops existing free-form source values.
CREATE TYPE "PostingSource" AS ENUM ('LINKED_IN', 'INDEED', 'GREENHOUSE', 'LEVER');

ALTER TABLE "JobPosting"
DROP COLUMN "source",
ADD COLUMN "source" "PostingSource";

CREATE UNIQUE INDEX "JobPosting_userId_source_sourceId_key"
ON "JobPosting"("userId", "source", "sourceId");
