// GET /api/groups/[slug]/unread
// Retourne pour chaque channel du groupe :
//   - Le nombre de messages non lus (count)
//   - Le nombre de mentions/replies non lus (mentionCount)
// Pour affichage dans la sidebar du groupe.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// On clampe le compteur à 99 pour afficher "99+"
const MAX_COUNT = 99;

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ channels: [] });
  }

  const { slug } = await params;
  const userId = session.user.id;

  const group = await db.group.findUnique({
    where: { slug },
    select: {
      id: true,
      channels: {
        where: { isDeleted: false },
        select: { id: true },
      },
    },
  });

  if (!group) return NextResponse.json({ channels: [] });

  // Récupère tous les ReadState de cet user pour les channels du groupe
  const channelIds = group.channels.map((c) => c.id);
  const readStates = await db.channelReadState.findMany({
    where: { userId, channelId: { in: channelIds } },
    select: { channelId: true, lastReadAt: true },
  });
  const readMap = new Map(readStates.map((r) => [r.channelId, r.lastReadAt]));

  // Pour chaque channel : compter les messages plus récents que lastReadAt
  // Et compter les mentions/replies qui concernent cet user
  const results = await Promise.all(
    channelIds.map(async (channelId) => {
      const lastReadAt = readMap.get(channelId);

      const baseWhere = {
        channelId,
        isDeleted: false,
        // Exclure ses propres messages
        authorId: { not: userId },
        ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
      };

      // Count total des messages non lus
      const count = await db.channelMessage.count({ where: baseWhere });

      // Count des mentions/replies
      let mentionCount = 0;
      if (count > 0) {
        mentionCount = await db.channelMessage.count({
          where: {
            ...baseWhere,
            OR: [
              // Mentions
              { mentions: { some: { mentionedUserId: userId } } },
              // Replies à un message qui m'appartient
              { replyTo: { authorId: userId } },
            ],
          },
        });
      }

      return {
        channelId,
        count: Math.min(count, MAX_COUNT),
        countOverflow: count > MAX_COUNT,
        mentionCount: Math.min(mentionCount, MAX_COUNT),
        mentionOverflow: mentionCount > MAX_COUNT,
      };
    })
  );

  return NextResponse.json({ channels: results });
}
