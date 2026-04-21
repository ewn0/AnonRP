// Helper Pusher côté serveur (envoie d'événements vers les clients connectés)
// Utilisé dans les routes API pour notifier les clients des nouveaux messages, etc.

import Pusher from "pusher";

// Instance singleton de Pusher
// En dev Next.js recompile souvent → on stocke globalement pour éviter de recréer l'instance
const globalForPusher = globalThis as unknown as {
  pusher: Pusher | undefined;
};

export const pusher =
  globalForPusher.pusher ??
  new Pusher({
    appId: process.env.PUSHER_APP_ID!,
    key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
    secret: process.env.PUSHER_SECRET!,
    cluster: process.env.PUSHER_CLUSTER || "eu",
    useTLS: true,
  });

if (process.env.NODE_ENV !== "production") globalForPusher.pusher = pusher;

/**
 * Noms canoniques des channels Pusher.
 * Les channels "presence-" permettent de suivre qui est connecté (nécessite auth).
 * Les channels "private-" nécessitent aussi auth.
 */
export const pusherChannels = {
  // Chat d'un channel de groupe
  channelChat: (channelId: string) => `private-channel-${channelId}`,

  // Présence (membres en ligne) dans un groupe
  groupPresence: (groupId: string) => `presence-group-${groupId}`,

  // Notifications personnelles d'un user
  userNotifications: (userId: string) => `private-user-${userId}`,
} as const;

export const pusherEvents = {
  MESSAGE_NEW: "message:new",
  MESSAGE_EDITED: "message:edited",
  MESSAGE_DELETED: "message:deleted",
  CHANNEL_CREATED: "channel:created",
  CHANNEL_DELETED: "channel:deleted",
  NOTIFICATION: "notification",
} as const;
