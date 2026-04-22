# 🩹 Fix cadeaux persistants + Feature non-lus

## ✅ Ce qui est corrigé/ajouté

### 🎁 Bugs cadeaux (les 2 problèmes que tu as vus)
- **Le message système est maintenant persisté en BDD** dans `ChannelMessage` avec un flag `isGiftSystem`
- Plus besoin d'être présent pour le voir : en rechargeant la page ou en revenant plus tard, il est toujours là
- Il compte aussi dans l'historique (pagination, non-lus, etc.)
- Rendu spécial : message centré avec dégradé violet/rose et texte en gras pour les noms

### 🔔 Feature non-lus
- **Badge à côté du nom du channel** dans la sidebar du groupe
- **Rouge avec chiffre** si tu as des mentions/replies non lus (ça te concerne directement)
- **Gris avec chiffre** si juste des messages normaux
- **99+** si plus de 99
- **Marqué lu quand tu scrolles en bas du chat** (pas juste en ouvrant la page)
- Refresh auto toutes les 30s via polling

## 🚀 Installation

### 1. Modifier le schema Prisma

⚠️ **Étape critique** — ouvre `SCHEMA-CHANGES.md` dans ce ZIP et suis les 5 modifs à copier-coller dans ton `prisma/schema.prisma`.

C'est rapide (2 minutes) et je t'ai choisi cette méthode plutôt qu'un schéma complet à écraser pour ne pas perdre tes dernières modifs.

### 2. Appliquer la migration

```bash
cd C:\Users\Asala\Desktop\AnonRP
npx prisma db push
```

### 3. Copier les fichiers

Copie `src/` par-dessus ton projet (écrase les fichiers existants).

### 4. Redémarre

```bash
# Ctrl+C pour arrêter npm run dev
npm run dev
```

## 🧪 Tests

### Test 1 — Le cadeau persiste (problème 1 corrigé)
1. Compte A et B dans le même channel
2. A offre un cadeau à B depuis la sidebar (hover 🎁)
3. Le message doré apparaît pour les deux
4. B quitte le channel et y revient → **le message est toujours là** ✅

### Test 2 — Le cadeau est vu par tous (problème 2 corrigé)
1. A offre un cadeau à B pendant que C n'est pas dans le channel
2. C ouvre le channel plus tard → **il voit le message** ✅

### Test 3 — Non-lus basiques
1. Compte A va dans `#général`
2. Compte B envoie 3 messages dans `#général`
3. Dans la sidebar de A : badge gris "3" à côté de `#général`
4. A ouvre le channel, scrolle en bas → badge disparaît ✅

### Test 4 — Mentions en rouge
1. Compte B envoie "Salut @A comment tu vas ?" dans `#général`
2. Dans la sidebar de A : badge **rouge "1"** à côté de `#général` (car A est mentionné)
3. A ouvre, scrolle en bas → badge disparaît ✅

### Test 5 — Seulement quand on scrolle en bas
1. 50 messages non lus dans `#général`
2. A ouvre le channel mais scrolle vers le haut pour lire les anciens
3. Badge reste affiché
4. A scrolle jusqu'en bas → badge disparaît ✅

## 📝 Fichiers du ZIP

```
prisma/
├── unread-migration.sql       (migration SQL manuelle si tu préfères pas passer par Prisma)

SCHEMA-CHANGES.md              (les modifs à coller dans ton schema.prisma)

src/
├── app/
│   ├── (main)/g/[slug]/
│   │   ├── group-sidebar.tsx         (nouvelle avec badges non-lus)
│   │   └── c/[channelSlug]/
│   │       └── chat-view.tsx         (mise à jour : cadeau persisté + scroll-to-read)
│   └── api/
│       ├── channels/[id]/
│       │   ├── messages/route.ts     (inclut isGiftSystem dans le GET)
│       │   └── mark-read/route.ts    (NOUVELLE : marque comme lu)
│       ├── groups/[slug]/
│       │   └── unread/route.ts       (NOUVELLE : compte les non-lus)
│       └── gifts/route.ts            (persiste le message système en BDD)
└── lib/
    └── use-unread.ts                 (hook React pour les non-lus)
```

## 🐛 En cas de problème

- **"ChannelReadState does not exist"** → tu as sauté `npx prisma db push`
- **"Unknown field isGiftSystem"** → pareil, la migration n'est pas passée
- **Badges non-lus ne s'affichent pas** → vérifie avec F12 → Network l'appel à `/api/groups/[slug]/unread`, la réponse
- **Les anciens cadeaux d'avant ce patch ne s'affichent plus** → c'est normal, ils n'étaient pas en BDD. Les nouveaux cadeaux fonctionneront.
