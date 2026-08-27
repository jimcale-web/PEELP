-- CreateEnum
CREATE TYPE "AccessDuration" AS ENUM ('MONTHLY', 'YEARLY');

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "accessDuration" "AccessDuration",
ADD COLUMN     "accessExpiresAt" TIMESTAMP(3);
