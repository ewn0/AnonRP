-- Migration SQL pour ajouter le champ isInvisible sur User
-- Lance cette migration APRÈS avoir appliqué le schema.prisma du ZIP 2

-- Ajoute le champ (défaut false = visible)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isInvisible" BOOLEAN NOT NULL DEFAULT false;

-- Index pour filtrer rapidement les users non-invisibles
CREATE INDEX IF NOT EXISTS "User_isInvisible_idx" ON "User"("isInvisible");
