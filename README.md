# 📦 Gros patch — Frontend & UI (ZIP 2/2)

⚠️ **Avant d'appliquer ce ZIP : le ZIP 1 (backend) doit être déjà appliqué et migré.**

## 🚀 Installation

1. **Arrête `npm run dev`**

2. **Copie-colle** :
   - `src/` par-dessus ton projet
   - `prisma/schema.prisma` par-dessus le tien (NB: ajoute `isInvisible` au User)

3. **Migration BDD** :
   ```bash
   npx prisma migrate dev --name invisible_mode
   ```

4. **Relance** :
   ```bash
   npm run dev
   ```

## ✨ Ce qui devient visible

### 🔔 Cloche de notifications (header)
- Badge rouge avec nombre de non lues
- Clic → panneau déroulant des 15 dernières
- "Tout marquer comme lu"
- Clic sur une notification avec un lien → t'emmène à la page + marque comme lu
- Refresh auto toutes les 60s

### 📊 Stats dans le header (à côté du logo)
- **Niveau + mini barre XP** (cliquable → profil)
- **Coins** (cliquable → boutique)
- Refresh auto toutes les 30s

### 👁️ Toggle invisible (ADMIN only)
- Icône 👁️ dans le header → clique pour passer invisible 👁️‍🗨️
- En mode invisible :
  - Tu n'apparais PAS dans les listes de membres des groupes
  - Tu n'apparais PAS dans les compteurs "X en ligne"
  - Ton `lastSeenAt` n'est plus mis à jour
  - Tu restes fonctionnel : tu peux lire, poster, modérer
- Un indicateur ambre s'affiche pour te rappeler que tu es invisible

### 🖊️ Édition de tes propres messages
- Au hover d'un message que tu as envoyé il y a <15 min → icône 🖊️
- Clic → textarea inline (Entrée = enregistrer, Échap = annuler)
- Diffusion temps réel aux autres
- Badge "(modifié)" ajouté à ton message

### ↪️ Répondre à un message
- Au hover d'un message → icône ↪
- Clic → bandeau "Réponse à @user" s'affiche au-dessus de l'input
- Ton message est lié au précédent (citation visible au-dessus)
- L'auteur original reçoit une notification "a répondu à ton message"

### @ Mentions dans les messages
- Tape `@` suivi du début d'un pseudo → autocomplete apparaît au-dessus de l'input
- Flèches ↑↓ pour naviguer, Tab/Entrée pour valider
- Dans les messages, les mentions sont highlighted en violet
- La personne mentionnée reçoit une notification

### 🏛️ Accès staff plateforme
- Les admins/modos plateforme peuvent accéder à TOUS les groupes, même privés
- Badge "staff" s'affiche à côté du nom du groupe
- Ils peuvent modérer, supprimer des messages, voir l'historique

### 📋 Validation des demandes de rejoindre
- Badge ambre "X" dans la sidebar du groupe (si des demandes en attente)
- Clic → page `/g/[slug]/requests`
- Pour chaque demande : avatar + nom + niveau + date + message optionnel
- Boutons "✓ Accepter" et "✗ Refuser" (avec raison optionnelle)
- Notifications envoyées automatiquement au demandeur

### 📫 Emails réels (Resend)
- À l'inscription, un vrai email est envoyé via Resend
- Template HTML soigné, thème AnonRP
- Fallback console si `RESEND_API_KEY` manquante

### 👋 Auto-join Général
- Chaque nouvel inscrit est ajouté automatiquement au groupe "Général"

## 🧪 Comment tester

### Le mode invisible
1. Tu es ADMIN
2. Clique sur 👁️ dans le header → icône passe en 👁️‍🗨️ ambre
3. Ouvre un 2e navigateur (navigation privée) avec un user normal
4. Dans le 2e navigateur, va sur `/g/general` → tu ne vois pas ton compte ADMIN dans la sidebar

### Les mentions
1. Dans un channel, commence un message par `@a` (avec le début d'un autre user)
2. Suggestions apparaissent → choisis-en un avec Tab ou Entrée
3. Envoie le message → l'autre user reçoit une notification (cloche 🔔)

### Répondre à un message
1. Hover sur un message d'un autre → clique ↪
2. Bandeau "Réponse à..." apparaît
3. Écris ta réponse, envoie
4. Le message affiche une citation au-dessus

### Éditer ton message
1. Envoie un message
2. Hover dessus → clique 🖊️
3. Edite dans la textarea, appuie Entrée
4. Le message se met à jour en temps réel pour tous

### Demande de rejoindre
1. Avec le compte A : crée un groupe privé
2. Avec le compte B : va sur `/g/[slug]` → clique "Rejoindre"
3. Avec le compte A : tu dois voir le badge ambre dans la sidebar
4. Clique → tu arrives sur `/g/[slug]/requests`
5. Accepte ou refuse, le compte B reçoit une notification

## ⚠️ Notes

- Si après le patch tu as une erreur Prisma "The table X does not exist", c'est que tu as sauté la migration. Relance `npx prisma migrate dev`
- Si les mentions ne fonctionnent pas, vérifie que le user mentionné n'est pas invisible
- Le compteur de présence compte les ADMIN invisibles à 0 (ils n'apparaissent pas dans la liste)
