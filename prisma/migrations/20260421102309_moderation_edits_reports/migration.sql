-- CreateEnum
CREATE TYPE "NameChangeStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'NAME_CHANGE_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'NAME_CHANGE_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE 'MESSAGE_DELETED_BY_MOD';
ALTER TYPE "NotificationType" ADD VALUE 'REPORT_HANDLED';

-- AlterTable
ALTER TABLE "ChannelMessage" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedById" TEXT,
ADD COLUMN     "deletedReason" VARCHAR(300);

-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "activeCountUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "activeMembersCount24h" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "GroupNameChangeRequest" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "currentName" VARCHAR(50) NOT NULL,
    "proposedName" VARCHAR(50) NOT NULL,
    "currentSlug" TEXT,
    "proposedSlug" TEXT,
    "reason" VARCHAR(500),
    "status" "NameChangeStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupNameChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GroupNameChangeRequest_status_createdAt_idx" ON "GroupNameChangeRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "GroupNameChangeRequest_groupId_idx" ON "GroupNameChangeRequest"("groupId");

-- CreateIndex
CREATE INDEX "Report_reportedUserId_createdAt_idx" ON "Report"("reportedUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "GroupNameChangeRequest" ADD CONSTRAINT "GroupNameChangeRequest_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupNameChangeRequest" ADD CONSTRAINT "GroupNameChangeRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelMessage" ADD CONSTRAINT "ChannelMessage_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
