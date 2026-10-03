-- Replace the case-sensitive company-name unique with a case-insensitive one.
-- Prisma cannot declare an expression index, so this is a raw migration.
DROP INDEX "Company_userId_name_city_country_key";
CREATE UNIQUE INDEX "Company_userId_name_key" ON "Company"("userId", lower("name"));
