import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { GroupSidebar } from "./group-sidebar";
import { GroupPresenceBar } from "./group-presence-bar";
import { MembersSidebar } from "./members-sidebar";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function GroupLayout({ children, params }: LayoutProps) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=/g/${slug}`);

  const group = await db.group.findUnique({
    where: { slug },
    include: {
      category: { select: { name: true, emoji: true } },
      channels: {
        where: { isDeleted: false },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        select: {
          id: true, slug: true, name: true, type: true,
          isSystem: true, isLocked: true, writePermission: true,
        },
      },
      memberships: {
        where: { userId: session.user.id },
        select: { role: true },
      },
    },
  });

  if (!group) notFound();

  const me = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, coins: true },
  });
  const isPlatformAdmin = me?.role === "ADMIN";
  const isPlatformMod = me?.role === "MODERATOR";
  const isPlatformStaff = isPlatformAdmin || isPlatformMod;

  const membership = group.memberships[0];
  const isMember = !!membership;
  const isGroupMod = membership?.role === "MODERATOR" || membership?.role === "ADMIN";
  const isOwner = group.ownerId === session.user.id;
  const canEditGroup = (isOwner || isPlatformAdmin) && (!group.isSystemGroup || isPlatformAdmin);

  if (!isMember && !isPlatformStaff) {
    return <div className="max-w-4xl mx-auto">{children}</div>;
  }

  let pendingRequestsCount = 0;
  if (isOwner || isGroupMod || isPlatformStaff) {
    pendingRequestsCount = await db.groupJoinRequest.count({
      where: { groupId: group.id, status: "PENDING" },
    });
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] -mt-6 -mx-4 md:-mx-0">
      <aside className="w-60 shrink-0 border-r border-border bg-card/50 flex flex-col">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <Link
            href={`/g/${group.slug}`}
            className="flex items-center gap-2 min-w-0 flex-1 hover:opacity-80 transition-opacity"
          >
            <span className="text-xl">{group.category?.emoji ?? "🏷️"}</span>
            <div className="min-w-0">
              <div className="font-semibold truncate flex items-center gap-1">
                {group.name}
                {!isMember && isPlatformStaff && (
                  <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-400" title="Accès staff plateforme">
                    staff
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">{group.memberCount} membres</div>
            </div>
          </Link>

          {pendingRequestsCount > 0 && (isOwner || isGroupMod || isPlatformStaff) && (
            <Link
              href={`/g/${group.slug}/requests`}
              title={`${pendingRequestsCount} demande(s) en attente`}
              className="shrink-0 relative px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-xs font-semibold"
            >
              {pendingRequestsCount}
            </Link>
          )}

          {canEditGroup && (
            <Link
              href={`/g/${group.slug}/edit`}
              title="Modifier le groupe"
              className="shrink-0 text-muted-foreground hover:text-foreground p-1 rounded hover:bg-accent"
            >
              ⚙️
            </Link>
          )}
        </div>

        <GroupSidebar
          groupSlug={group.slug}
          groupId={group.id}
          channels={group.channels}
          canManage={isGroupMod || isPlatformAdmin}
        />

        <GroupPresenceBar groupId={group.id} />
      </aside>

      <div className="flex-1 flex flex-col min-w-0">{children}</div>

      <MembersSidebar
        groupId={group.id}
        groupSlug={group.slug}
        currentUserId={session.user.id}
        currentUserCoins={me?.coins ?? 0}
      />
    </div>
  );
}
