import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { AdminGiftsActions } from "./admin-gifts-actions";

export default async function AdminGiftsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const me = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (me?.role !== "ADMIN") redirect("/feed");

  // Cadeaux des dernières 24h (éligibles à l'annulation)
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recent = await db.gift.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      giftType: { select: { slug: true, name: true, costCoins: true } },
      sender: { select: { username: true, displayName: true } },
      receiver: { select: { username: true, displayName: true } },
    },
  });

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
          ← Retour
        </Link>
        <h1 className="text-3xl font-bold">Cadeaux (24h)</h1>
        <span className="text-muted-foreground">({recent.length})</span>
      </div>

      {recent.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Aucun cadeau dans les dernières 24h.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {recent.map((g) => (
            <Card key={g.id}>
              <CardContent className="p-3 flex items-center gap-3 flex-wrap">
                <span className="text-2xl">{giftEmoji(g.giftType.slug)}</span>

                <div className="flex-1 min-w-[200px]">
                  <div className="text-sm flex items-center gap-1 flex-wrap">
                    <Link href={`/u/${g.sender.username}`} className="text-primary hover:underline font-semibold">
                      @{g.sender.username}
                    </Link>
                    <span>a offert</span>
                    <span className="font-semibold">{g.giftType.name}</span>
                    <span>à</span>
                    <Link href={`/u/${g.receiver.username}`} className="text-primary hover:underline font-semibold">
                      @{g.receiver.username}
                    </Link>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {new Date(g.createdAt).toLocaleString("fr-FR")}
                    </span>
                  </div>
                  {g.message && (
                    <p className="text-xs text-muted-foreground italic mt-1">"{g.message}"</p>
                  )}
                  {g.cancelledAt && (
                    <p className="text-xs text-destructive mt-1">
                      ⚠ Annulé le {new Date(g.cancelledAt).toLocaleString("fr-FR")}
                    </p>
                  )}
                </div>

                {!g.cancelledAt && <AdminGiftsActions giftId={g.id} />}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function giftEmoji(slug: string): string {
  const map: Record<string, string> = {
    rose: "🌹", teddy: "🧸", star: "⭐", heart: "❤️",
    diamond: "💎", crown: "👑", dragon: "🐉",
  };
  return map[slug] ?? "🎁";
}
