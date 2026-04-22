-- Migration SQL pour :
-- 1) Table ChannelReadState (suivi des non-lus par user/channel)
-- 2) Flag isGiftSystem + giftId sur ChannelMessage (pour persister les messages système de cadeaux)
--
-- Applique automatiquement via : npx prisma db push
-- OU manuellement via : psql $DATABASE_URL -f prisma/unread-migration.sql

CREATE TABLE IF NOT EXISTS "ChannelReadState" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "channelId" TEXT NOT NULL,
  "lastReadAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "lastReadMessageId" TEXT,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ChannelReadState_userId_channelId_key" ON "ChannelReadState"("userId", "channelId");
CREATE INDEX IF NOT EXISTS "ChannelReadState_channelId_idx" ON "ChannelReadState"("channelId");
CREATE INDEX IF NOT EXISTS "ChannelReadState_userId_idx" ON "ChannelReadState"("userId");

-- Ajouter isGiftSystem + giftId sur ChannelMessage
ALTER TABLE "ChannelMessage" ADD COLUMN IF NOT EXISTS "isGiftSystem" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ChannelMessage" ADD COLUMN IF NOT EXISTS "giftId" TEXT;

DO $$ BEGIN
  ALTER TABLE "ChannelMessage" ADD CONSTRAINT "ChannelMessage_giftId_fkey"
    FOREIGN KEY ("giftId") REFERENCES "Gift"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "ChannelMessage_giftId_idx" ON "ChannelMessage"("giftId");
