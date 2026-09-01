/*
  Warnings:

  - You are about to drop the column `description` on the `resource` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `resource` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "resource" DROP COLUMN "description",
DROP COLUMN "title";
