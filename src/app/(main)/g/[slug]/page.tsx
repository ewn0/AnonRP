import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JoinButton } from "./join-button";
import { PendingRequests } from "./pending-requests";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function GroupPage({ params }: PageProps) {
  const { slug } = await params;
  const session = await auth();

  const group = await db.group.findUnique({
    where: { slug },
    include: {
      category: { select: { name: true, emoji: true, slug: true } },
      owner: { select: { username: true } },
      memberships: session?.user
        ? { where: { userId: session.user.id }, select: { role: true } }
        : false,
      channels: {
        where: { isDeleted: false },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        take: 1,
        select: { slug: true },
      },
    },
  });

  if (!group) notFound();

  const userMembership = group.memberships?.[0];
  const isMember = !!userMembership;
  const isGroupMod = userMembership?.role === "MODERATOR" || userMembership?.role === "ADMIN";

  // Si membre, rediriger automatiquement vers le premier channel (général par défaut)
  if (isMember && group.channels.length > 0) {
    redirect(`/g/${group.slug}/c/${group.channels[0].slug}`);
  }

  let pendingRequest = null;
  if (session?.user && !isMember && group.visibility === "PRIVATE") {
    pendingRequest = await db.groupJoinRequest.findUnique({
      where: { groupId_userId: { groupId: group.id, userId: session.user.id } },
      select: { status: true, createdAt: true },
    });
  }

  const pendingCount = isGroupMod
    ? await db.groupJoinRequest.count({
        where: { groupId: group.id, status: "PENDING" },
      })
    : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">
      <Card className="overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-primary/30 to-purple-900/30" />
        <CardContent className="pt-0">
          <div className="flex items-start gap-4 -mt-10">
            <div className="w-20 h-20 rounded-xl bg-primary/20 border-4 border-background flex items-center justify-center text-3xl shrink-0">
              {group.iconUrl ? (
                <img src={group.iconUrl} alt={group.name} className="w-full h-full rounded-xl object-cover" />
              ) : (
                group.category?.emoji ?? "🏷️"
              )}
            </div>
            <div className="flex-1 min-w-0 pt-10">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold">{group.name}</h1>
                {group.isSystemGroup && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">Officiel</span>
                )}
                {group.visibility === "PRIVATE" && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">🔒 Privé</span>
                )}
                {group.isNSFW && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/20 text-destructive">18+</span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {group.category?.name} · {group.memberCount} membre{group.memberCount > 1 ? "s" : ""} · Créé par <Link href={`/u/${group.owner.username}`} className="text-primary hover:underline">@{group.owner.username}</Link>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-6">
            {session?.user ? (
              <JoinButton
                slug={group.slug}
                isMember={isMember}
                isOwner={group.ownerId === session.user.id}
                visibility={group.visibility}
                pendingRequest={pendingRequest}
              />
            ) : (
              <Link href="/login">
                <Button>Se connecter pour rejoindre</Button>
              </Link>
            )}
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-semibold mb-2">À propos</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{group.description}</p>
          </div>

          {group.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {group.tags.map((t) => (
                <span key={t} className="text-xs text-primary/80 bg-primary/10 px-2 py-1 rounded">
                  #{t}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {isGroupMod && pendingCount > 0 && (
        <PendingRequests slug={group.slug} initialCount={pendingCount} />
      )}
    </div>
  );
}
