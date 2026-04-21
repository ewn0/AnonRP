"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { usePusherChannel } from "@/lib/pusher-client";

interface Channel {
  id: string;
  slug: string;
  name: string;
  type: string;
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

export function GroupSidebar({ groupSlug, groupId, channels: initialChannels, canManage }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ channelSlug?: string }>();
  const currentChannelSlug = params.channelSlug;

  const [channels, setChannels] = useState<Channel[]>(initialChannels);
  const [showCreate, setShowCreate] = useState(false);

  // Recevoir les nouveaux channels via Pusher (channel "presence-group-<id>" utilisé aussi pour broadcasts groupe)
  usePusherChannel<Channel>(`presence-group-${groupId}`, "channel:created", (newChannel) => {
    setChannels((prev) => {
      if (prev.some((c) => c.id === newChannel.id)) return prev;
      return [...prev, newChannel].sort((a, b) => a.name.localeCompare(b.name));
    });
  });

  usePusherChannel<{ channelId: string }>(`presence-group-${groupId}`, "channel:deleted", ({ channelId }) => {
    setChannels((prev) => prev.filter((c) => c.id !== channelId));
    // Si on était sur le channel supprimé, rediriger vers le premier channel restant
    const current = channels.find((c) => c.slug === currentChannelSlug);
    if (current?.id === channelId) {
      router.push(`/g/${groupSlug}`);
    }
  });

  return (
    <div className="flex-1 overflow-y-auto py-2">
      <div className="px-3 py-1 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
          Channels
        </span>
        {canManage && (
          <button
            onClick={() => setShowCreate(true)}
            className="text-muted-foreground hover:text-foreground text-lg leading-none"
            title="Créer un channel"
          >
            +
          </button>
        )}
      </div>

      <nav className="mt-1">
        {channels.map((c) => {
          const isActive = currentChannelSlug === c.slug;
          return (
            <Link
              key={c.id}
              href={`/g/${groupSlug}/c/${c.slug}`}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm transition-colors ${
                isActive
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              }`}
            >
              <span className="text-muted-foreground/70">
                {c.isLocked ? "🔒" : c.type === "ANNOUNCEMENT" ? "📢" : "#"}
              </span>
              <span className="truncate flex-1">{c.name}</span>
              {c.isSystem && (
                <span className="text-[10px] text-muted-foreground/50">sys</span>
              )}
            </Link>
          );
        })}
      </nav>

      {showCreate && (
        <CreateChannelDialog
          groupSlug={groupSlug}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}

function CreateChannelDialog({
  groupSlug,
  onClose,
}: {
  groupSlug: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/groups/${groupSlug}/channels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "Erreur");
        return;
      }
      onClose();
      router.push(`/g/${groupSlug}/c/${body.channel.slug}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-lg p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold mb-4">Nouveau channel</h2>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-sm font-medium">Nom</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={50}
              placeholder="rp-nocturne"
              className="w-full mt-1 h-10 rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Description (optionnel)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
              className="w-full mt-1 h-10 rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-md border border-border hover:bg-accent"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || name.length < 1}
              className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground disabled:opacity-50"
            >
              {loading ? "Création..." : "Créer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
