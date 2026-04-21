# ⚠️ Instructions importantes pour appliquer ce patch

## Fichiers à SUPPRIMER dans ton projet

Avant de copier les nouveaux fichiers, supprime ces dossiers/fichiers qui sont obsolètes :

### 1. Anciennes routes auth qui entrent en conflit avec NextAuth

Supprime ces dossiers :

```
src/app/api/auth/register/
src/app/api/auth/verify-email/
```

**Garde** `src/app/api/auth/[...nextauth]/` (c'est NextAuth lui-même, on ne le touche pas).

### 2. Anciens fichiers de la phase 2a (on pivote vers Discord-like)

Rien à supprimer côté code Phase 2a que tu avais appliqué : le nouveau schéma Prisma remplace les modèles Post/Comment. La migration s'occupera de supprimer les tables en BDD.

## Après avoir appliqué le patch

1. **Arrête `npm run dev`** (Ctrl+C)

2. **Applique la migration** (qui va supprimer les tables Post/Comment et ajouter Channel/ChannelMessage/etc.) :
   ```bash
   npx prisma migrate dev --name discord_like_refactor
   ```
   Il te dira qu'il va perdre des données — c'est normal, dis `y`.

3. **Relance le seed** :
   ```bash
   npm run db:seed
   ```

4. **Relance le serveur** :
   ```bash
   npm run dev
   ```

5. **Déconnecte-toi, reconnecte-toi** pour rafraîchir ton JWT.

## Tester

- Va sur `/admin` → tu dois voir le panel admin
- Va sur `/admin/users` → tu vois tous les users
- Si un user n'est pas vérifié → bouton "✓ Vérif" qui force la vérification
- Crée un nouveau groupe → regarde `/g/[slug]`, il aura désormais un channel "Général"

## Le bug email

Le lien dans les mails pointe maintenant vers `/api/verify-email?token=...` (sans `/auth/` dedans).  
Essaie de t'inscrire avec un nouveau compte et de cliquer sur le lien → ça devrait marcher cette fois.
