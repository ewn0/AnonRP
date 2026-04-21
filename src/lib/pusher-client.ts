"use client";

// Hook React pour connecter le client à Pusher
// Gère la connexion + abonnement à un channel + nettoyage

import { useEffect, useRef, useState } from "react";
import PusherClient, { Channel, PresenceChannel } from "pusher-js";

// Instance globale pour ne pas créer plusieurs connexions
let pusherInstance: PusherClient | null = null;

function getPusherClient(): PusherClient {
  if (!pusherInstance) {
    if (!process.env.NEXT_PUBLIC_PUSHER_KEY) {
      throw new Error("NEXT_PUBLIC_PUSHER_KEY manquante dans .env");
    }
    pusherInstance = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "eu",
      channelAuthorization: {
        endpoint: "/api/pusher/auth",
        transport: "ajax",
      },
    });

    if (process.env.NODE_ENV === "development") {
      pusherInstance.connection.bind("state_change", (states: any) => {
        console.log("[Pusher]", states.previous, "→", states.current);
      });
    }
  }
  return pusherInstance;
}

/**
 * Hook : s'abonne à un channel Pusher et écoute un événement.
 */
export function usePusherChannel<T = any>(
  channelName: string | null,
  eventName: string,
  handler: (data: T) => void
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!channelName) return;

    const pusher = getPusherClient();
    const channel = pusher.subscribe(channelName);

    const cb = (data: T) => handlerRef.current(data);
    channel.bind(eventName, cb);

    return () => {
      channel.unbind(eventName, cb);
      pusher.unsubscribe(channelName);
    };
  }, [channelName, eventName]);
}

/**
 * Itère les membres d'un presence channel, en étant compatible avec
 * les différentes versions de pusher-js (certaines ont .each(), d'autres non).
 */
function iterateMembers(members: any): Array<{ id: string; info: any }> {
  const list: Array<{ id: string; info: any }> = [];

  // Version récente : members.members est un objet { [id]: info }
  if (members?.members && typeof members.members === "object") {
    for (const [id, info] of Object.entries(members.members)) {
      list.push({ id, info });
    }
    return list;
  }

  // Version plus ancienne : members.each((m) => ...)
  if (typeof members?.each === "function") {
    members.each((m: any) => list.push({ id: m.id, info: m.info }));
    return list;
  }

  return list;
}

interface PresenceMember {
  id: string;
  info: {
    username?: string;
    displayName?: string;
    avatarUrl?: string;
  };
}

export function usePresenceChannel(channelName: string | null) {
  const [members, setMembers] = useState<PresenceMember[]>([]);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!channelName) {
      setMembers([]);
      setCount(0);
      return;
    }

    const pusher = getPusherClient();
    const channel = pusher.subscribe(channelName) as PresenceChannel;

    const onSubscribed = (data: any) => {
      // data contient .members (l'objet members) et .count
      // On passe directement channel.members qui est la source de vérité après souscription
      const source = channel.members ?? data;
      const list = iterateMembers(source);
      setMembers(list);
      setCount(typeof source.count === "number" ? source.count : list.length);
    };

    const onAdded = (member: PresenceMember) => {
      setMembers((prev) => {
        if (prev.some((m) => m.id === member.id)) return prev;
        return [...prev, member];
      });
      setCount((c) => c + 1);
    };

    const onRemoved = (member: PresenceMember) => {
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
      setCount((c) => Math.max(0, c - 1));
    };

    channel.bind("pusher:subscription_succeeded", onSubscribed);
    channel.bind("pusher:member_added", onAdded);
    channel.bind("pusher:member_removed", onRemoved);

    return () => {
      channel.unbind("pusher:subscription_succeeded", onSubscribed);
      channel.unbind("pusher:member_added", onAdded);
      channel.unbind("pusher:member_removed", onRemoved);
      pusher.unsubscribe(channelName);
    };
  }, [channelName]);

  return { members, count };
}
