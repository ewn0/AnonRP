"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { usePresenceChannel } from "@/lib/pusher-client";
import { getPresenceStatus, formatLastSeen, type PresenceStatus } from "@/lib/presence";
import { UserAvatar } from "@/components/user-avatar";

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
}

export function MembersSidebar({ groupId, groupSlug }: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

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

  const groups = useMemo(() => {
    // Si le user est invisible pour lui-même → il n'apparaît pas dans la liste
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

  if (loading && members.length === 0) {
    return (
      <aside className="w-60 shrink-0 border-l border-border bg-card/30 overflow-y-auto p-3 text-sm text-muted-foreground">
        Chargement…
      </aside>
    );
  }

  return (
    <aside className="w-60 shrink-0 border-l border-border bg-card/30 overflow-y-auto py-2">
      {groups.owner && (
        <Section title="Propriétaire" count={1}>
          <MemberRow member={groups.owner} />
        </Section>
      )}

      {groups.mods.length > 0 && (
        <Section title="Modérateurs" count={groups.mods.length}>
          {groups.mods.map((m) => (
            <MemberRow key={m.user.id} member={m} />
          ))}
        </Section>
      )}

      {groups.online.length > 0 && (
        <Section title="En ligne" count={groups.online.length}>
          {groups.online.map((m) => (
            <MemberRow key={m.user.id} member={m} />
          ))}
        </Section>
      )}

      {groups.offline.length > 0 && (
        <Section title="Hors ligne" count={groups.offline.length}>
          {groups.offline.map((m) => (
            <MemberRow key={m.user.id} member={m} dimmed />
          ))}
        </Section>
      )}
    </aside>
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

function MemberRow({ member, dimmed = false }: { member: Member & { status: PresenceStatus }; dimmed?: boolean }) {
  const nameColor = dimmed ? "text-muted-foreground" : "text-foreground";

  return (
    <Link
      href={`/u/${member.user.username}`}
      className={`flex items-center gap-2 px-3 py-1.5 hover:bg-accent/50 transition-colors ${dimmed ? "opacity-70" : ""}`}
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
  );
}
