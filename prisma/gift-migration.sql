-- Ajouts au schema.prisma :
--
-- À ajouter dans le modèle User :
--   notificationPreferences UserNotificationPreferences?
--
-- À ajouter dans le modèle Gift :
--   channelId        String?
--   channel          Channel? @relation(fields: [channelId], references: [id])
--   cancelledAt      DateTime?
--   cancelledByUserId String?
--   isRefunded       Boolean  @default(false)
--
-- À ajouter au modèle Channel :
--   giftsReceived    Gift[]
--
-- Nouveau modèle :
--
-- model UserNotificationPreferences {
--   id                       String  @id @default(cuid())
--   userId                   String  @unique
--   emailOnMention           Boolean @default(false)
--   emailOnReply             Boolean @default(false)
--   emailOnGiftReceived      Boolean @default(false)
--   emailOnJoinRequestApproved Boolean @default(false)
--   emailOnJoinRequestReceived Boolean @default(false)
--   emailOnMessageDeleted    Boolean @default(false)
--   emailOnReportHandled     Boolean @default(false)
--   emailOnLevelUp           Boolean @default(false)
--   createdAt                DateTime @default(now())
--   updatedAt                DateTime @updatedAt
--
--   user User @relation(fields: [userId], references: [id], onDelete: Cascade)
-- }

-- On peut appliquer avec : npx prisma db push

-- Sinon, SQL manuel :

CREATE TABLE IF NOT EXISTS "UserNotificationPreferences" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE,
  "emailOnMention" BOOLEAN NOT NULL DEFAULT false,
  "emailOnReply" BOOLEAN NOT NULL DEFAULT false,
  "emailOnGiftReceived" BOOLEAN NOT NULL DEFAULT false,
  "emailOnJoinRequestApproved" BOOLEAN NOT NULL DEFAULT false,
  "emailOnJoinRequestReceived" BOOLEAN NOT NULL DEFAULT false,
  "emailOnMessageDeleted" BOOLEAN NOT NULL DEFAULT false,
  "emailOnReportHandled" BOOLEAN NOT NULL DEFAULT false,
  "emailOnLevelUp" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

ALTER TABLE "Gift" ADD COLUMN IF NOT EXISTS "channelId" TEXT;
ALTER TABLE "Gift" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP;
ALTER TABLE "Gift" ADD COLUMN IF NOT EXISTS "cancelledByUserId" TEXT;
ALTER TABLE "Gift" ADD COLUMN IF NOT EXISTS "isRefunded" BOOLEAN NOT NULL DEFAULT false;

-- Foreign key optionnelle sur Channel
DO $$ BEGIN
  ALTER TABLE "Gift" ADD CONSTRAINT "Gift_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "Gift_channelId_idx" ON "Gift"("channelId");
