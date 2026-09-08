-- AlterTable
ALTER TABLE "user" ADD COLUMN "enrolledCategoryId" TEXT;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_enrolledCategoryId_fkey" FOREIGN KEY ("enrolledCategoryId") REFERENCES "category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
