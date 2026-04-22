# 📝 Modifications à faire dans ton `prisma/schema.prisma`

Au lieu de te donner le schéma complet (risque d'écraser tes dernières modifs), je te liste les 3 petits ajouts à faire.

## 1) Dans le modèle `User`, ajoute cette relation à la fin :

```prisma
  channelReadStates     ChannelReadState[]
```

Par exemple juste avant `@@index([email])`.

## 2) Dans le modèle `Channel`, ajoute cette relation :

```prisma
  readStates    ChannelReadState[]
```

À côté de `messages ChannelMessage[]`.

## 3) Dans le modèle `ChannelMessage`, ajoute ces 3 lignes :

```prisma
  // Message système pour les cadeaux (persisté en BDD)
  isGiftSystem Boolean @default(false)
  giftId       String?
  gift         Gift?   @relation("GiftSystemMessage", fields: [giftId], references: [id], onDelete: SetNull)
```

Par exemple après le champ `countsForCoins`.

## 4) Dans le modèle `Gift`, ajoute cette relation :

```prisma
  systemMessages  ChannelMessage[] @relation("GiftSystemMessage")
```

À côté de `cancelledBy`.

## 5) Ajoute le nouveau modèle à la fin du fichier (avant `model RateLimit`) :

```prisma
// ============================================================
// SUIVI DES NON-LUS PAR CHANNEL
// ============================================================

model ChannelReadState {
  id                String   @id @default(cuid())
  userId            String
  channelId         String
  lastReadAt        DateTime @default(now())
  lastReadMessageId String?
  updatedAt         DateTime @updatedAt

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  channel Channel @relation(fields: [channelId], references: [id], onDelete: Cascade)

  @@unique([userId, channelId])
  @@index([channelId])
  @@index([userId])
}
```

---

## ✅ Après les modifs, applique :

```bash
npx prisma db push
```

Prisma va automatiquement synchroniser les tables avec ton Neon.

Vérifie ensuite dans Prisma Studio que la table `ChannelReadState` existe bien.
