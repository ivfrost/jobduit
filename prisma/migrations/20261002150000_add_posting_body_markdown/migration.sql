-- Preserve the posting's original formatting as Markdown so the extension can
-- render it verbatim without shipping raw, possibly-hostile HTML.
ALTER TABLE "JobPosting" ADD COLUMN "bodyMarkdown" TEXT;
