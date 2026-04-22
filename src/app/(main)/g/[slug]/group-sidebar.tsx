"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useGroupUnread, formatUnreadCount } from "@/lib/use-unread";

interface Channel {
  id: string;
  slug: string;
  name: string;
  type: "TEXT" | "VOICE" | "ANNOUNCEMENT";
  isSystem: boolean;
  isLocked: boolean;
  writePermission: string;
}

interface Props {
  groupSlug: string;
  groupId: string;
  channels: Channel[];
  canManage: boolean;
}

export function GroupSidebar({ groupSlug, channels, canManage }: Props) {
  const params = useParams<{ channelSlug?: string }>();
  const activeSlug = params?.channelSlug;

  const { unread, refresh } = useGroupUnread(groupSlug);
  const [creating, setCreating] = useState(false);

  async function createChannel() {
    const name = prompt("Nom du channel :");
    if (!name || name.length < 2) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/groups/${groupSlug}/channels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body.error || "Erreur");
        return;
      }
      window.location.reload();
    } finally {
      setCreating(false);
    }
  }

  return (
    <nav className="flex-1 overflow-y-auto py-2">
      <div className="px-3 pb-1 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Channels texte
        </span>
        {canManage && (
          <button
            onClick={createChannel}
            disabled={creating}
            title="Créer un channel"
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            +
          </button>
        )}
      </div>

      <ul>
        {channels.map((c) => {
          const isActive = c.slug === activeSlug;
          const u = unread.get(c.id);
          const hasUnread = u && (u.count > 0 || u.mentionCount > 0);
          const hasMentions = u && u.mentionCount > 0;

          return (
            <li key={c.id}>
              <Link
                href={`/g/${groupSlug}/c/${c.slug}`}
                onClick={() => {
                  // Refresh les non-lus juste après
                  setTimeout(refresh, 1000);
                }}
                className={`group flex items-center gap-2 px-3 py-1.5 mx-1 rounded hover:bg-accent/50 transition-colors ${
                  isActive
                    ? "bg-accent text-foreground"
                    : hasUnread
                    ? "text-foreground font-semibold"
                    : "text-muted-foreground"
                }`}
              >
                <span className="text-muted-foreground/70">
                  {c.isLocked ? "🔒" : c.type === "ANNOUNCEMENT" ? "📢" : "#"}
                </span>
                <span className="truncate flex-1 text-sm">{c.name}</span>

                {/* Badge non-lus : rouge si mentions, gris sinon */}
                {hasUnread && !isActive && (
                  <span
                    className={`shrink-0 min-w-[20px] px-1.5 py-0.5 rounded-full text-[10px] font-bold text-center ${
                      hasMentions
                        ? "bg-destructive text-destructive-foreground"
                        : "bg-muted-foreground/30 text-foreground"
                    }`}
                    title={
                      hasMentions
                        ? `${u.mentionCount} mention${u.mentionCount > 1 ? "s" : ""} · ${u.count} message${u.count > 1 ? "s" : ""} au total`
                        : `${u.count} message${u.count > 1 ? "s" : ""} non lu${u.count > 1 ? "s" : ""}`
                    }
                  >
                    {hasMentions
                      ? formatUnreadCount(u.mentionCount, u.mentionOverflow)
                      : formatUnreadCount(u.count, u.countOverflow)}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
