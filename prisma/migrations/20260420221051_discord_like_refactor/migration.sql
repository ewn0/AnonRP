/*
  Warnings:

  - The values [POST,COMMENT] on the enum `ReportTargetType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `postCount` on the `Group` table. All the data in the column will be lost.
  - You are about to drop the `Comment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Post` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ChannelType" AS ENUM ('TEXT', 'VOICE', 'ANNOUNCEMENT');

-- CreateEnum
CREATE TYPE "ChannelWritePermission" AS ENUM ('MEMBERS', 'MODS_ONLY', 'READ_ONLY');

-- CreateEnum
CREATE TYPE "DeletionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('GROUP_DELETED', 'GROUP_BANNED', 'GROUP_KICKED', 'GROUP_BANNED_FROM', 'GROUP_PROMOTED', 'JOIN_REQUEST_APPROVED', 'JOIN_REQUEST_REJECTED', 'OWNERSHIP_TRANSFER_OFFER', 'OWNERSHIP_TRANSFER_ACCEPTED', 'FRIEND_REQUEST', 'FRIEND_REQUEST_ACCEPTED', 'GIFT_RECEIVED', 'LEVEL_UP', 'PREMIUM_EXPIRING', 'ADMIN_MESSAGE');

-- AlterEnum
BEGIN;
CREATE TYPE "ReportTargetType_new" AS ENUM ('USER', 'CHANNEL_MESSAGE', 'MESSAGE', 'GROUP', 'CHANNEL');
ALTER TABLE "Report" ALTER COLUMN "targetType" TYPE "ReportTargetType_new" USING ("targetType"::text::"ReportTargetType_new");
ALTER TYPE "ReportTargetType" RENAME TO "ReportTargetType_old";
ALTER TYPE "ReportTargetType_new" RENAME TO "ReportTargetType";
DROP TYPE "public"."ReportTargetType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_authorId_fkey";

-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_parentId_fkey";

-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_postId_fkey";

-- DropForeignKey
ALTER TABLE "Post" DROP CONSTRAINT "Post_authorId_fkey";

-- DropForeignKey
ALTER TABLE "Post" DROP CONSTRAINT "Post_groupId_fkey";

-- AlterTable
ALTER TABLE "Group" DROP COLUMN "postCount",
ADD COLUMN     "isSystemGroup" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxTextChannels" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "maxVoiceChannels" INTEGER NOT NULL DEFAULT 2;

-- AlterTable
ALTER TABLE "GroupMembership" ADD COLUMN     "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "nickname" TEXT;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "isSystem" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "Comment";

-- DropTable
DROP TABLE "Post";

-- CreateTable
CREATE TABLE "Channel" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "description" VARCHAR(200),
    "type" "ChannelType" NOT NULL DEFAULT 'TEXT',
    "position" INTEGER NOT NULL DEFAULT 0,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "writePermission" "ChannelWritePermission" NOT NULL DEFAULT 'MEMBERS',
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Channel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelMessage" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "replyToId" TEXT,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "countsForCoins" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannelMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupDeletionRequest" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "reason" VARCHAR(500),
    "status" "DeletionStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupDeletionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupOwnershipTransfer" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "GroupOwnershipTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Channel_groupId_position_idx" ON "Channel"("groupId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Channel_groupId_slug_key" ON "Channel"("groupId", "slug");

-- CreateIndex
CREATE INDEX "ChannelMessage_channelId_createdAt_idx" ON "ChannelMessage"("channelId", "createdAt");

-- CreateIndex
CREATE INDEX "ChannelMessage_authorId_createdAt_idx" ON "ChannelMessage"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "GroupDeletionRequest_status_idx" ON "GroupDeletionRequest"("status");

-- CreateIndex
CREATE INDEX "GroupOwnershipTransfer_groupId_status_idx" ON "GroupOwnershipTransfer"("groupId", "status");

-- CreateIndex
CREATE INDEX "GroupOwnershipTransfer_toUserId_status_idx" ON "GroupOwnershipTransfer"("toUserId", "status");

-- CreateIndex
CREATE INDEX "SystemNotification_userId_readAt_idx" ON "SystemNotification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "SystemNotification_userId_createdAt_idx" ON "SystemNotification"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Channel" ADD CONSTRAINT "Channel_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelMessage" ADD CONSTRAINT "ChannelMessage_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "ChannelMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelMessage" ADD CONSTRAINT "ChannelMessage_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelMessage" ADD CONSTRAINT "ChannelMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupDeletionRequest" ADD CONSTRAINT "GroupDeletionRequest_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupDeletionRequest" ADD CONSTRAINT "GroupDeletionRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupOwnershipTransfer" ADD CONSTRAINT "GroupOwnershipTransfer_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupOwnershipTransfer" ADD CONSTRAINT "GroupOwnershipTransfer_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupOwnershipTransfer" ADD CONSTRAINT "GroupOwnershipTransfer_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemNotification" ADD CONSTRAINT "SystemNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
