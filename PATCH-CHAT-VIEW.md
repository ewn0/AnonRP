# Patch manuel pour chat-view.tsx

Dans ton fichier `src/app/(main)/g/[slug]/c/[channelSlug]/chat-view.tsx`, tu dois ajouter **un 4e hook Pusher** pour gérer les messages système de cadeaux.

## 📍 Où ajouter

Cherche ce bloc (vers la ligne 105-115, dans la fonction `ChatView`) :

```tsx
  usePusherChannel<{ messageId: string; content: string; editedAt: string }>(
    `private-channel-${channel.id}`,
    "message:edited",
    ({ messageId, content, editedAt }) =>
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, content, isEdited: true, editedAt } : m)))
  );
```

**Ajoute immédiatement après** :

```tsx
  // Message système pour les cadeaux envoyés dans le channel
  usePusherChannel<{
    id: string;
    giftSlug: string;
    giftName: string;
    senderUsername: string;
    senderDisplayName: string | null;
    receiverUsername: string;
    receiverDisplayName: string | null;
    createdAt: string;
  }>(
    `private-channel-${channel.id}`,
    "gift:system",
    (payload) => {
      const emoji: Record<string, string> = {
        rose: "🌹", teddy: "🧸", star: "⭐", heart: "❤️",
        diamond: "💎", crown: "👑", dragon: "🐉",
      };
      const icon = emoji[payload.giftSlug] ?? "🎁";
      const senderName = payload.senderDisplayName || payload.senderUsername;
      const receiverName = payload.receiverDisplayName || payload.receiverUsername;
      // On insère un "faux" message système dans la liste
      const systemMessage: any = {
        id: payload.id,
        content: `🎁 ${senderName} a offert ${icon} ${payload.giftName} à ${receiverName} !`,
        createdAt: payload.createdAt,
        isEdited: false,
        replyToId: null,
        __isGiftSystem: true,
        author: {
          id: "system",
          username: "system",
          displayName: "AnonRP",
          avatarUrl: null,
          level: 0,
          role: "MEMBER",
          premiumTier: null,
        },
      };
      setMessages((prev) => addUnique(prev, systemMessage));
    }
  );
```

## 📍 Puis dans le rendu

Cherche ce bloc :
```tsx
              if (msg.isDeleted && !canModerate) {
                return <DeletedMessageLine key={msg.id} author={msg.author} />;
              }
```

**Ajoute juste avant** :
```tsx
              // Message système cadeau
              if ((msg as any).__isGiftSystem) {
                return (
                  <li
                    key={msg.id}
                    className="flex items-center justify-center py-2 my-1 mx-auto max-w-md"
                  >
                    <div className="px-4 py-2 rounded-full bg-gradient-to-r from-primary/20 to-purple-500/20 border border-primary/40 text-sm text-center shadow-sm">
                      {msg.content}
                    </div>
                  </li>
                );
              }
```

Voilà, ton chat peut désormais afficher les cadeaux reçus en messages système dorés dans le fil de conversation.

## ✅ Test rapide

1. Ouvre un channel de groupe à deux comptes (A et B)
2. Sur A, hover sur le nom de B dans la sidebar droite → clique 🎁
3. Choisis une rose → Offrir
4. Dans les deux navigateurs, un message stylisé apparaît dans le chat :
   `🎁 A a offert 🌹 Rose à B !`
