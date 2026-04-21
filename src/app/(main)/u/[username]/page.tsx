import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { formatLastSeen, getPresenceStatus, presenceLabel, presenceDotClass } from "@/lib/presence";
import { XpBar } from "@/components/xp-bar";

interface PageProps {
  params: Promise<{ username: string }>;
}

export default async function ProfilePage({ params }: PageProps) {
  const { username } = await params;
  const session = await auth();

  const user = await db.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
    select: {
      id: true,
      username: true,
      displayName: true,
      bio: true,
      avatarUrl: true,
      bannerUrl: true,
      level: true,
      xp: true,
      coins: true,
      role: true,
      premiumTier: true,
      createdAt: true,
      lastSeenAt: true,
      isBanned: true,
      xpBoostPercent: true,
    },
  });

  if (!user || user.isBanned) notFound();

  const isOwnProfile = session?.user?.id === user.id;
  const initials = (user.displayName || user.username).substring(0, 2).toUpperCase();
  const status = getPresenceStatus(user.lastSeenAt);

  const memberships = await db.groupMembership.findMany({
    where: {
      userId: user.id,
      group: { visibility: "PUBLIC" },
    },
    take: 10,
    orderBy: { joinedAt: "desc" },
    select: {
      role: true,
      group: {
        select: {
          slug: true,
          name: true,
          iconUrl: true,
          isSystemGroup: true,
          category: { select: { emoji: true } },
        },
      },
    },
  });

  // Sérialisation : Next ne sait pas sérialiser BigInt directement dans les props
  const xpAsString = user.xp.toString();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="overflow-hidden">
        <div
          className="h-32 bg-gradient-to-r from-primary/40 to-purple-900/40"
          style={user.bannerUrl ? { backgroundImage: `url(${user.bannerUrl})`, backgroundSize: "cover" } : undefined}
        />

        <CardContent className="pt-0">
          <div className="flex items-end gap-4 -mt-12">
            <div className="relative shrink-0">
              <div className="w-24 h-24 rounded-full border-4 border-background bg-primary/20 flex items-center justify-center text-2xl font-bold overflow-hidden">
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <span
                className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-4 border-background ${presenceDotClass(status)}`}
                title={presenceLabel(status)}
              />
            </div>

            <div className="pb-2 flex-1 min-w-0">
              <h1 className="text-2xl font-bold truncate">{user.displayName || user.username}</h1>
              <p className="text-muted-foreground text-sm">@{user.username}</p>
              <p className="text-xs text-muted-foreground mt-1">
                <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${presenceDotClass(status)}`} />
                {status === "online" ? (
                  <span className="text-green-400">En ligne</span>
                ) : (
                  <>{presenceLabel(status)} · {formatLastSeen(user.lastSeenAt)}</>
                )}
              </p>
            </div>

            {isOwnProfile && (
              <Link href="/settings" className="text-xs text-primary hover:underline pb-2 shrink-0">
                Modifier
              </Link>
            )}
          </div>

          {/* Barre XP */}
          <div className="mt-6 p-4 rounded-lg bg-muted/30 border border-border/50">
            <XpBar level={user.level} xp={xpAsString} />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <StatBlock label="Niveau" value={user.level.toString()} />
            <StatBlock label="AnonCoins" value={user.coins.toLocaleString()} />
            <StatBlock
              label="Membre depuis"
              value={new Date(user.createdAt).toLocaleDateString("fr-FR", { month: "short", year: "numeric" })}
            />
          </div>

          {user.bio && (
            <div className="mt-6 p-4 rounded-lg bg-muted/30 border border-border/50">
              <p className="text-sm whitespace-pre-wrap">{user.bio}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2 mt-6">
            {user.role === "ADMIN" && (
              <span className="px-2 py-1 rounded-full text-xs bg-destructive/20 text-destructive border border-destructive/30">
                Admin
              </span>
            )}
            {user.role === "MODERATOR" && (
              <span className="px-2 py-1 rounded-full text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30">
                Modérateur
              </span>
            )}
            {user.premiumTier === "GOLD" && (
              <span className="px-2 py-1 rounded-full text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30">
                ⭐ Gold
              </span>
            )}
            {user.premiumTier === "SILVER" && (
              <span className="px-2 py-1 rounded-full text-xs bg-gray-400/20 text-gray-300 border border-gray-400/30">
                🥈 Argent
              </span>
            )}
            {user.premiumTier === "BRONZE" && (
              <span className="px-2 py-1 rounded-full text-xs bg-orange-700/20 text-orange-400 border border-orange-700/30">
                🥉 Bronze
              </span>
            )}
            {user.xpBoostPercent > 0 && (
              <span className="px-2 py-1 rounded-full text-xs bg-primary/20 text-primary border border-primary/30">
                +{user.xpBoostPercent.toFixed(2)}% XP 🎁
              </span>
            )}
          </div>

          {memberships.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold mb-3">Groupes rejoints</h3>
              <div className="flex flex-wrap gap-2">
                {memberships.map((m) => (
                  <Link
                    key={m.group.slug}
                    href={`/g/${m.group.slug}`}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50 hover:border-primary/50 transition-colors text-xs"
                  >
                    <span>{m.group.category?.emoji ?? "🏷️"}</span>
                    <span>{m.group.name}</span>
                    {m.role !== "MEMBER" && (
                      <span className="text-[9px] px-1 rounded bg-primary/20 text-primary">
                        {m.role === "ADMIN" ? "admin" : "modo"}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 p-4 rounded-lg border border-dashed border-border/50 text-center text-sm text-muted-foreground">
            Les cadeaux reçus apparaîtront ici (Phase 3)
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-center">
      <div className="text-lg font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
