"use client";

import { useEffect, useState, useCallback } from "react";

export interface ChannelUnread {
  channelId: string;
  count: number;
  countOverflow: boolean;
  mentionCount: number;
  mentionOverflow: boolean;
}

/**
 * Hook qui récupère les non-lus d'un groupe et les rafraîchit périodiquement.
 *
 * @param groupSlug - Slug du groupe à surveiller
 * @returns Map de channelId -> ChannelUnread + fonction refresh
 */
export function useGroupUnread(groupSlug: string) {
  const [unread, setUnread] = useState<Map<string, ChannelUnread>>(new Map());

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/groups/${groupSlug}/unread`);
      if (!res.ok) return;
      const data = await res.json();
      const map = new Map<string, ChannelUnread>();
      for (const c of data.channels) {
        map.set(c.channelId, c);
      }
      setUnread(map);
    } catch {}
  }, [groupSlug]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30_000); // refresh toutes les 30s
    return () => clearInterval(interval);
  }, [refresh]);

  return { unread, refresh };
}

/**
 * Format un compteur en appliquant le plafond "99+".
 */
export function formatUnreadCount(count: number, overflow: boolean): string {
  if (overflow || count > 99) return "99+";
  return count.toString();
}
