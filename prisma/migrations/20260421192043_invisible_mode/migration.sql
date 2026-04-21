-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'JOIN_REQUEST_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE 'MESSAGE_MENTION';
ALTER TYPE "NotificationType" ADD VALUE 'MESSAGE_REPLY';

-- AlterTable
ALTER TABLE "ChannelMessage" ADD COLUMN     "editedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SystemNotification" ADD COLUMN     "linkUrl" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isInvisible" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ChannelMessageMention" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "mentionedUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChannelMessageMention_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChannelMessageMention_mentionedUserId_idx" ON "ChannelMessageMention"("mentionedUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelMessageMention_messageId_mentionedUserId_key" ON "ChannelMessageMention"("messageId", "mentionedUserId");

-- CreateIndex
CREATE INDEX "User_isInvisible_idx" ON "User"("isInvisible");

-- AddForeignKey
ALTER TABLE "ChannelMessageMention" ADD CONSTRAINT "ChannelMessageMention_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ChannelMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelMessageMention" ADD CONSTRAINT "ChannelMessageMention_mentionedUserId_fkey" FOREIGN KEY ("mentionedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
