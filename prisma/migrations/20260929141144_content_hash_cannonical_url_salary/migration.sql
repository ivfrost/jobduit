/*
  Warnings:

  - A unique constraint covering the columns `[userId,canonicalUrl]` on the table `JobPosting` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,source,sourceId]` on the table `JobPosting` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `canonicalUrl` to the `JobPosting` table without a default value. This is not possible if the table is not empty.
  - Added the required column `contentHash` to the `JobPosting` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "JobPosting_userId_sourceUrl_key";

-- AlterTable
ALTER TABLE "JobPosting" ADD COLUMN     "canonicalUrl" TEXT NOT NULL,
ADD COLUMN     "contentHash" VARCHAR(64) NOT NULL,
ADD COLUMN     "salaryCurrency" VARCHAR(3),
ADD COLUMN     "salaryMax" INTEGER,
ADD COLUMN     "salaryMin" INTEGER,
ADD COLUMN     "salaryPeriod" VARCHAR(8),
ADD COLUMN     "salaryRaw" TEXT,
ADD COLUMN     "sourceId" VARCHAR(64);

-- CreateIndex
CREATE INDEX "JobPosting_userId_contentHash_idx" ON "JobPosting"("userId", "contentHash");

-- CreateIndex
CREATE INDEX "JobPosting_userId_companyId_capturedAt_idx" ON "JobPosting"("userId", "companyId", "capturedAt");

-- CreateIndex
CREATE UNIQUE INDEX "JobPosting_userId_canonicalUrl_key" ON "JobPosting"("userId", "canonicalUrl");

-- CreateIndex
CREATE UNIQUE INDEX "JobPosting_userId_source_sourceId_key" ON "JobPosting"("userId", "source", "sourceId");
