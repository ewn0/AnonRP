"use client";

import { usePresenceChannel } from "@/lib/pusher-client";

export function GroupPresenceBar({ groupId }: { groupId: string }) {
  const { count } = usePresenceChannel(`presence-group-${groupId}`);

  return (
    <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
      {count} en ligne
    </div>
  );
}
