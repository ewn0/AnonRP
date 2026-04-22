// GET /api/users/[username]/gifts
// Cadeaux reçus par un user (triés par type, avec compteur)

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

interface RouteParams {
  params: Promise<{ username: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { username } = await params;

  const user = await db.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" }, isBanned: false },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  // On exclut les cadeaux annulés/remboursés
  const gifts = await db.gift.findMany({
    where: {
      receiverId: user.id,
      cancelledAt: null,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      giftType: {
        select: {
          slug: true,
          name: true,
          iconUrl: true,
          xpBoostPercent: true,
        },
      },
    },
    take: 500, // On cappé à 500 pour la perf
  });

  // Regrouper par type
  const byType: Record<string, { type: any; count: number; latest: Date }> = {};
  for (const g of gifts) {
    const slug = g.giftType.slug;
    if (!byType[slug]) {
      byType[slug] = {
        type: g.giftType,
        count: 0,
        latest: g.createdAt,
      };
    }
    byType[slug].count++;
    if (g.createdAt > byType[slug].latest) byType[slug].latest = g.createdAt;
  }

  const summary = Object.values(byType).sort((a, b) => b.count - a.count);

  return NextResponse.json({
    total: gifts.length,
    types: summary,
  });
}
