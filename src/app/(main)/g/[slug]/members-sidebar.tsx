"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { usePresenceChannel } from "@/lib/pusher-client";
import { getPresenceStatus, formatLastSeen, type PresenceStatus } from "@/lib/presence";
import { UserAvatar } from "@/components/user-avatar";
import { GiftModal } from "@/components/gift-modal";

interface Member {
  role: "ADMIN" | "MODERATOR" | "MEMBER";
  nickname: string | null;
  joinedAt: string;
  isOwner: boolean;
  _selfInvisible?: boolean;
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    level: number;
    role: "MEMBER" | "MODERATOR" | "ADMIN";
    premiumTier: string | null;
    lastSeenAt: string | null;
  };
}

interface Props {
  groupId: string;
  groupSlug: string;
  currentUserId?: string;
  currentUserCoins?: number;
}

export function MembersSidebar({ groupId, groupSlug, currentUserId, currentUserCoins }: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [giftTarget, setGiftTarget] = useState<Member | null>(null);
  const [myCoins, setMyCoins] = useState(currentUserCoins ?? 0);

  // Channel courant pour le cadeau public
  const params = useParams<{ channelSlug?: string }>();
  const [currentChannel, setCurrentChannel] = useState<{ id: string; name: string } | null>(null);

  const { members: presenceMembers } = usePresenceChannel(`presence-group-${groupId}`);
  const onlineIds = useMemo(() => new Set(presenceMembers.map((m) => m.id)), [presenceMembers]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/groups/${groupSlug}/members`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setMembers(data.members);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 120_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [groupSlug]);

  // Charger l'id du channel courant pour le cadeau public
  useEffect(() => {
    if (!params.channelSlug) {
      setCurrentChannel(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/groups/${groupSlug}/channels`);
      if (!res.ok) return;
      const data = await res.json();
      if (cancelled) return;
      const ch = data.channels?.find((c: any) => c.slug === params.channelSlug);
      setCurrentChannel(ch ? { id: ch.id, name: ch.name } : null);
    })();
    return () => {
      cancelled = true;
    };
  }, [params.channelSlug, groupSlug]);

  const groups = useMemo(() => {
    const visible = members.filter((m) => !m._selfInvisible);
    const withStatus = visible.map((m) => ({
      ...m,
      status: onlineIds.has(m.user.id)
        ? ("online" as PresenceStatus)
        : getPresenceStatus(m.user.lastSeenAt),
    }));

    const owner = withStatus.find((m) => m.isOwner);
    const mods = withStatus.filter((m) => !m.isOwner && (m.role === "MODERATOR" || m.role === "ADMIN"));
    const simpleMembers = withStatus.filter((m) => !m.isOwner && m.role === "MEMBER");
    const online = simpleMembers.filter((m) => m.status === "online" || m.status === "away");
    const offline = simpleMembers.filter((m) => m.status === "offline");
    return { owner, mods, online, offline };
  }, [members, onlineIds]);

  function onGiftOpen(member: Member) {
    if (!currentUserId || member.user.id === currentUserId) return;
    setGiftTarget(member);
  }

  if (loading && members.length === 0) {
    return (
      <aside className="w-60 shrink-0 border-l border-border bg-card/30 overflow-y-auto p-3 text-sm text-muted-foreground">
        Chargement…
      </aside>
    );
  }

  return (
    <>
      <aside className="w-60 shrink-0 border-l border-border bg-card/30 overflow-y-auto py-2">
        {groups.owner && (
          <Section title="Propriétaire" count={1}>
            <MemberRow member={groups.owner} currentUserId={currentUserId} onGift={onGiftOpen} />
          </Section>
        )}

        {groups.mods.length > 0 && (
          <Section title="Modérateurs" count={groups.mods.length}>
            {groups.mods.map((m) => (
              <MemberRow key={m.user.id} member={m} currentUserId={currentUserId} onGift={onGiftOpen} />
            ))}
          </Section>
        )}

        {groups.online.length > 0 && (
          <Section title="En ligne" count={groups.online.length}>
            {groups.online.map((m) => (
              <MemberRow key={m.user.id} member={m} currentUserId={currentUserId} onGift={onGiftOpen} />
            ))}
          </Section>
        )}

        {groups.offline.length > 0 && (
          <Section title="Hors ligne" count={groups.offline.length}>
            {groups.offline.map((m) => (
              <MemberRow key={m.user.id} member={m} currentUserId={currentUserId} onGift={onGiftOpen} dimmed />
            ))}
          </Section>
        )}
      </aside>

      {giftTarget && (
        <GiftModal
          receiverId={giftTarget.user.id}
          receiverUsername={giftTarget.user.username}
          receiverDisplayName={giftTarget.user.displayName}
          myCoins={myCoins}
          channelId={currentChannel?.id}
          channelName={currentChannel?.name}
          onClose={() => setGiftTarget(null)}
          onSuccess={(newCoins) => setMyCoins(newCoins)}
        />
      )}
    </>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title} — {count}
      </p>
      <div>{children}</div>
    </div>
  );
}

function MemberRow({
  member,
  currentUserId,
  onGift,
  dimmed = false,
}: {
  member: Member & { status: PresenceStatus };
  currentUserId?: string;
  onGift: (m: Member) => void;
  dimmed?: boolean;
}) {
  const nameColor = dimmed ? "text-muted-foreground" : "text-foreground";
  const canGift = currentUserId && member.user.id !== currentUserId;

  return (
    <div className={`group relative ${dimmed ? "opacity-70" : ""}`}>
      <Link
        href={`/u/${member.user.username}`}
        className="flex items-center gap-2 px-3 py-1.5 hover:bg-accent/50 transition-colors pr-8"
        title={member.status === "online" ? "En ligne" : formatLastSeen(member.user.lastSeenAt)}
      >
        <UserAvatar user={member.user} size="sm" forceStatus={member.status} noLink />
        <div className="min-w-0 flex-1">
          <div className={`text-sm truncate ${nameColor}`}>
            {member.nickname || member.user.displayName || member.user.username}
          </div>
        </div>
        {member.user.role === "ADMIN" && (
          <span className="text-[9px] px-1 rounded bg-destructive/20 text-destructive shrink-0">admin</span>
        )}
        {member.user.premiumTier === "GOLD" && !dimmed && (
          <span className="text-[10px] shrink-0">⭐</span>
        )}
      </Link>

      {canGift && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onGift(member);
          }}
          title="Offrir un cadeau"
          className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity px-1 hover:scale-110"
        >
          🎁
        </button>
      )}
    </div>
  );
}
