ALTER TABLE "Application"
DROP CONSTRAINT "Application_postingId_fkey",
ADD CONSTRAINT "Application_postingId_fkey"
  FOREIGN KEY ("postingId") REFERENCES "JobPosting"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
