# 🚀 Guide d'installation pas-à-pas

Ce guide te conduit du ZIP décompressé au site qui tourne sur ton ordi.
Compte ~20 minutes la première fois.

## Étape 1 — Installer Node.js (si pas déjà fait)

1. Va sur https://nodejs.org
2. Télécharge la version **LTS** (actuellement 20 ou 22)
3. Installe-la (suivant-suivant-terminer)
4. Ouvre un **terminal** (PowerShell sur Windows, Terminal sur Mac) et tape :
   ```
   node --version
   ```
   Tu dois voir quelque chose comme `v20.x.x`. Si oui → c'est bon.

## Étape 2 — Ouvrir le projet dans VS Code

1. Installe VS Code si besoin : https://code.visualstudio.com
2. Ouvre VS Code
3. `File` → `Open Folder` → sélectionne le dossier `anonrp` décompressé
4. Ouvre le **terminal intégré** : menu `Terminal` → `New Terminal`

Toutes les commandes suivantes se tapent dans ce terminal.

## Étape 3 — Installer les dépendances

```bash
npm install
```

Ça peut prendre 1-3 minutes. Normal que ça télécharge plein de trucs.

## Étape 4 — Créer ton fichier `.env`

Dans le dossier du projet, **copie** `.env.example` et **renomme** la copie en `.env`.

Sur Mac/Linux, dans le terminal :
```bash
cp .env.example .env
```

Sur Windows PowerShell :
```powershell
Copy-Item .env.example .env
```

## Étape 5 — Remplir le fichier `.env`

Ouvre `.env` dans VS Code et remplis ces variables :

### `DATABASE_URL`
C'est ta connection string Neon.
1. Va sur https://console.neon.tech
2. Projet → `Connection Details` → copie la "Connection string"
3. Colle-la entre les guillemets de `DATABASE_URL`

### `AUTH_SECRET`
Génère une chaîne aléatoire longue. Dans ton terminal :

Mac/Linux :
```bash
openssl rand -base64 32
```

Windows PowerShell :
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object {[byte](Get-Random -Max 256)}))
```

Copie le résultat entre les guillemets de `AUTH_SECRET`.

### `NEXTAUTH_URL`
Laisse `http://localhost:3000` pour le développement local.

### `RESEND_API_KEY`
**Optionnel en dev** : laisse vide, les emails seront loggés dans la console du terminal (c'est suffisant pour tester).

Pour activer les vrais emails plus tard : crée un compte sur https://resend.com.

### `INITIAL_ADMIN_*`
Choisis un email, un nom d'utilisateur et un **mot de passe fort** pour ton compte admin. C'est avec ça que tu te connecteras en tant qu'admin.

## Étape 6 — Créer les tables dans la base de données

```bash
npx prisma migrate dev --name init
```

Prisma va se connecter à Neon et créer toutes les tables. Si tu vois "Your database is now in sync with your schema" → parfait.

## Étape 7 — Remplir les données par défaut (admin, cadeaux, plans premium...)

```bash
npm run db:seed
```

Tu verras défiler les créations :
- ✅ Admin créé
- ✅ 7 types de cadeaux créés
- ✅ 6 packs de coins créés
- ✅ 3 plans premium créés
- ✅ 20 paramètres de config

## Étape 8 — Lancer le site !

```bash
npm run dev
```

Ouvre ton navigateur sur **http://localhost:3000** 🎉

Tu devrais voir la page d'accueil AnonRP.

## Étape 9 — Tester

1. Clique sur **Inscription**
2. Crée un compte test
3. Regarde le terminal : tu verras l'email de vérification loggé (puisque Resend n'est pas configuré)
4. Copie le lien de vérification depuis le terminal et colle-le dans le navigateur
5. Ton email est vérifié → tu peux te connecter

Ou connecte-toi directement avec le compte admin que tu as défini dans `.env`.

## 🐛 Problèmes courants

**`npm install` échoue avec une erreur `ERESOLVE`**
→ Tape `npm install --legacy-peer-deps`

**Erreur de connexion à la base**
→ Vérifie que `DATABASE_URL` est bien entre guillemets et correcte. Teste la connexion sur neon.tech directement.

**Port 3000 déjà utilisé**
→ Tape `npm run dev -- -p 3001` pour utiliser le port 3001 à la place.

**Erreur `AUTH_SECRET is not defined`**
→ Tu as oublié de renommer `.env.example` en `.env`, ou il est vide.

**Prisma Studio pour voir ta BDD visuellement**
→ Tape `npx prisma studio` → interface web sur http://localhost:5555

## ✅ Tu as fini la Phase 1

Quand tout marche, reviens me voir et on attaque la **Phase 2** :
- Création de groupes/forums
- Posts et commentaires
- Système de niveaux + XP
- Gain de coins par message
