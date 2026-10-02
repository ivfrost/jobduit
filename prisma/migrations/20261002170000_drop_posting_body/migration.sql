-- The plain-text body is gone: the LLM and extractors read bodyMarkdown directly.
ALTER TABLE "JobPosting" DROP COLUMN "body";
