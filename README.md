

# AnonRP

Plateforme de jeu de rôle anonyme en français, inspirée de Discord. Les utilisateurs rejoignent des **groupes** thématiques, discutent dans des **channels** en temps réel, gagnent de l'XP et des coins en participant, et peuvent s'offrir des cadeaux virtuels.

> **Statut :** en développement actif. Pas encore en production publique.

---

## 🧰 Stack technique

- **Framework :** Next.js 15 (App Router, Server Components)
- **Langage :** TypeScript
- **Base de données :** PostgreSQL (Neon) + Prisma 6
- **Auth :** NextAuth v5 (email + mot de passe, vérification par email)
- **UI :** Tailwind CSS + composants custom (thème sombre violet)
- **Temps réel :** Pusher Channels (chat, présence, notifications)
- **Emails :** Resend (domaine `anonrp.fr`)
- **Validation :** Zod
- **Paiements (prévu) :** Stripe

---

## ✅ Fonctionnalités implémentées

### Comptes & identité
- Création de compte avec vérification d'email par lien cliquable (Resend, domaine `anonrp.fr`)
- Profil utilisateur avec avatar, bio, bannière, niveau, XP, coins, groupes rejoints
- Statut de présence (en ligne / absent / hors ligne + horodatage de dernière connexion)
- **Mode invisible pour les admins** (masqués de toutes les listes de membres, même hors ligne)

### Groupes
- Groupe système « Général » auto-créé, auto-rejoint par tous les nouveaux inscrits
- Création de groupes par les utilisateurs (niveau 5 minimum + 200 coins)
- Visibilité publique ou privée (sur invitation / demande à rejoindre)
- Catégories prédéfinies et tags libres
- Recherche de groupes par tags
- Propriétaire + modérateurs + membres avec rôles hiérarchiques
- Demandes d'adhésion avec validation par l'owner/modos (+ notifications)
- **Admins et modérateurs plateforme accèdent à tous les groupes** sans restriction

### Channels
- Channels texte par groupe (limité selon le tier), permissions configurables (lecture seule, modos uniquement, etc.)
- Channel « Général » auto-créé et non-supprimable pour chaque groupe

### Chat temps réel
- Envoi de messages via Pusher, diffusion instantanée à tous les membres du channel
- **Répondre à un message** (citation + notification à l'auteur original)
- **Mentions `@username`** avec autocomplete en temps réel + notifications
- **Édition de ses propres messages** dans une fenêtre de 15 minutes
- Suppression de messages (par l'auteur, les modos de groupe, ou les admins plateforme) — toujours visibles par les modos
- Gain d'XP et de coins en discutant (avec cooldown et minimum de caractères pour éviter le spam)

### Modération
- Signalement de messages (9 motifs), avec limite de 5 signalements/heure par utilisateur
- Impossibilité de se signaler soi-même ou de signaler deux fois la même chose
- Panneau admin avec retranscription automatique des 50 messages autour du message signalé
- Bannissement rapide depuis le panneau admin
- Notifications sur webhook Discord (notif renforcée si 3+ reporters distincts en 1h)
- Suppression de messages par les modérateurs (notifications automatiques à l'auteur)

### Notifications
- Cloche 🔔 dans le header avec compteur de non-lues et panneau déroulant
- Types : mentions, réponses, cadeaux reçus, demandes de groupe acceptées/refusées, messages supprimés, etc.
- **Préférences par type d'événement pour recevoir aussi un email** (désactivées par défaut, opt-in via `/settings/notifications`)

### Économie & cadeaux
- Monnaie virtuelle (AnonCoins) gagnée en discutant
- Système de cadeaux avec boost XP permanent (plafonné à +20% cumulé)
- Envoi depuis un profil (anonyme) ou depuis un channel (annoncé publiquement via un message système stylisé)
- Rate limit : 20 cadeaux maximum par heure par utilisateur
- Annulation administrative possible dans les 24h (remboursement sender + retrait boost receiver)

| Cadeau | Prix 💰 | Boost XP | Quantité pour atteindre la limite max (+20%) |
|--------|---------:|----------|---------:|
| 🌹 Rose    |    500 | +0.01%   | 2000 |
| 🧸 Teddy   |  1 500 | +0.03%   |  667 |
| ⭐ Étoile  |  2 000 | +0.05%   |  400 |
| ❤️ Cœur    |  3 000 | +0.08%   |  250 |
| 💎 Diamant |  5 000 | +0.15%   |  134 |
| 👑 Couronne| 10 000 | +0.3%    |   67 |
| 🐉 Dragon  | 25 000 | +0.5%    |   40 |

### Panneau administrateur
- Gestion des utilisateurs (rôles, bannissements)
- Traitement des signalements avec contexte complet
- Gestion des demandes de changement de nom de groupe
- Annulation des cadeaux récents
- Audit log de toutes les actions sensibles

---

## 🚧 En cours / à venir

- Messagerie privée (DM) et système d'amis
- Boutique : achat de coins et abonnements premium via Stripe
- Bot Discord (synchronisation compte, notifications, rôles)
- Feed personnalisé avec activités récentes et indicateurs de non-lus
- Notifications push mobiles

---

## 🛠️ Installation locale

### Prérequis

- Node.js 20+
- npm ou pnpm
- Une base PostgreSQL (Neon recommandé pour la simplicité)
- Un compte Pusher (gratuit jusqu'à 200k messages/jour)
- Un compte Resend (optionnel — fallback console en dev si non configuré)

### Configuration

Crée un fichier `.env` à la racine :

```env
# Base de données (ta connection string Neon ou locale)
DATABASE_URL=""

# Secret pour NextAuth - génère-en un avec : openssl rand -base64 32
AUTH_SECRET="CHANGE_ME_LONG_RANDOM_STRING"

# URL du site (en local c'est ça)
NEXTAUTH_URL="http://localhost:3000"

# Email (pour la confirmation de compte) - on utilisera Resend plus tard
RESEND_API_KEY=""
EMAIL_FROM="noreply@anonrp.com"

STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=""

# --- Discord Bot (Phase 5 - laisse vide pour l'instant) ---
DISCORD_BOT_TOKEN=""
DISCORD_GUILD_ID=""
DISCORD_REPORTS_CHANNEL_ID=""
DISCORD_CLIENT_ID=""
DISCORD_CLIENT_SECRET=""

# --- Admin initial (utilisé par le script de seed) ---
INITIAL_ADMIN_EMAIL="admin@anonrp.local"
INITIAL_ADMIN_USERNAME="admin"
INITIAL_ADMIN_PASSWORD="ChangeMe2025!"

PUSHER_APP_ID=""
PUSHER_SECRET=""
PUSHER_CLUSTER="eu"
NEXT_PUBLIC_PUSHER_KEY=""
NEXT_PUBLIC_PUSHER_CLUSTER="eu"

# Discord whebook pour les reports
DISCORD_REPORTS_WEBHOOK_URL=""



# --- Resend (emails) ---
RESEND_API_KEY="re_iXbcjS3g_5oU1CZ4DGRGkyK9pugHroQCc" 
EMAIL_FROM="AnonRP <contact@anonrp.fr>"

# Bébou si tu as besoin des clés demande sur discord 
```

### Lancement

```bash
# Installer les dépendances
npm install

# Migrer la base de données
npx prisma migrate dev

# Seed (admin + catégories + groupe Général + cadeaux)
npm run db:seed
npx tsx prisma/seed-gifts.ts

# Lancer en dev
npm run dev
```

L'app est disponible sur [http://localhost:3000](http://localhost:3000).

### Commandes utiles

```bash
# Visualiser la BDD
npx prisma studio

# Recréer le client Prisma après modif du schema
npx prisma generate

# Pousser le schema vers la BDD sans migration (utile en dev)
npx prisma db push

# Donner à ton compte level 100 + 100k coins (pour tester)
npx tsx prisma/boost-me.ts

# Recalculer les boosts XP après modif de la grille
npx tsx prisma/recalculate-xp-boosts.ts
```

---
L'app est disponible sur [http://localhost:3000](http://localhost:3000).

### Commandes utiles

```bash
# Visualiser la BDD
npx prisma studio

# Recréer le client Prisma après modif du schema
npx prisma generate

# Pousser le schema vers la BDD sans migration (utile en dev)
npx prisma db push

# Donner à ton compte level 100 + 100k coins (pour tester)
npx tsx prisma/boost-me.ts

# Recalculer les boosts XP après modif de la grille
npx tsx prisma/recalculate-xp-boosts.ts
```

## 📐 Structure du projet

```
src/
├── app/
│   ├── (main)/              # Routes authentifiées (feed, groupes, profils, settings, admin)
│   │   ├── g/[slug]/        # Pages groupe (layout + channels + demandes)
│   │   ├── u/[username]/    # Profil utilisateur
│   │   └── admin/           # Panneau administrateur
│   ├── api/                 # Routes API
│   └── (auth)/              # Login, register, reset password
├── components/              # Composants réutilisables (avatar, cloche, modale cadeau, etc.)
├── lib/                     # Clients (db, auth, pusher, email, notify), validations Zod
└── middleware.ts            # Protection des routes
prisma/
├── schema.prisma            # Modèle de données
└── seed-*.ts                # Scripts de seed
```

---

## 📄 Licence

Non défini pour l'instant. Tous droits réservés par l'auteur.


