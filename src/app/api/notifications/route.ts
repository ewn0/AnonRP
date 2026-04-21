// Routes pour la cloche 🔔 de notifications
// GET /api/notifications → liste des notifs + compteur non lues
// POST /api/notifications/read → marquer comme lues (toutes ou une spécifique)

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const limit = Math.min(50, Math.max(5, parseInt(searchParams.get("limit") ?? "20", 10)));
  const unreadOnly = searchParams.get("unreadOnly") === "true";

  const [notifications, unreadCount] = await Promise.all([
    db.systemNotification.findMany({
      where: {
        userId: session.user.id,
        ...(unreadOnly ? { readAt: null } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        type: true,
        title: true,
        content: true,
        linkUrl: true,
        metadata: true,
        readAt: true,
        createdAt: true,
      },
    }),
    db.systemNotification.count({
      where: { userId: session.user.id, readAt: null },
    }),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}
