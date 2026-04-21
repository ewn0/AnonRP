// ⚠️ Ne pas écraser le schema.prisma entier !
// Ce fichier contient UNIQUEMENT les ajouts à faire dans ton schema.prisma existant.
//
// COMMENT APPLIQUER :
// 1. Ouvre src/schema.prisma (ton fichier)
// 2. Ajoute les modèles ci-dessous à la fin du fichier
// 3. Ajoute le champ `activeMembersCount24h` dans le modèle Group (voir ci-dessous)
// 4. Ajoute la relation `groupNameChangeRequests` dans le modèle Group et le modèle User
// 5. Lance `npx prisma migrate dev --name group_edits_and_mod`

// ============================================================
// À AJOUTER dans le modèle User (juste avant les @@index) :
// ============================================================

/*
  groupNameChangeRequests GroupNameChangeRequest[] @relation("NameChangeRequester")
*/

// ============================================================
// À AJOUTER dans le modèle Group (à côté de memberCount) :
// ============================================================

/*
  activeMembersCount24h Int @default(0)
  activeCountUpdatedAt  DateTime?

  nameChangeRequests GroupNameChangeRequest[]
*/

// ============================================================
// NOUVEAU MODÈLE à ajouter à la fin du schema.prisma :
// ============================================================

/*
model GroupNameChangeRequest {
  id            String   @id @default(cuid())
  groupId       String
  requestedById String
  currentName   String   @db.VarChar(50)
  proposedName  String   @db.VarChar(50)
  currentSlug   String?
  proposedSlug  String?
  reason        String?  @db.VarChar(500)

  status        NameChangeStatus @default(PENDING)
  reviewedById  String?
  reviewedAt    DateTime?
  reviewNote    String?

  createdAt     DateTime @default(now())

  group         Group    @relation(fields: [groupId], references: [id], onDelete: Cascade)
  requester     User     @relation("NameChangeRequester", fields: [requestedById], references: [id])

  @@index([status, createdAt])
  @@index([groupId])
}

enum NameChangeStatus {
  PENDING
  APPROVED
  REJECTED
  CANCELLED
}
*/
