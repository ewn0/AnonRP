// POST /api/pusher/auth
// Validation des abonnements aux channels private / presence

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { pusher } from "@/lib/pusher";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }

  const formData = await req.formData();
  const socketId = formData.get("socket_id") as string;
  const channelName = formData.get("channel_name") as string;

  if (!socketId || !channelName) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      isBanned: true,
      role: true,
      isInvisible: true,
    },
  });

  if (!user || user.isBanned) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const isPlatformStaff = user.role === "ADMIN" || user.role === "MODERATOR";

  // ============================
  // Channel chat : private-channel-<id>
  // ============================
  if (channelName.startsWith("private-channel-")) {
    const channelId = channelName.replace("private-channel-", "");

    const channel = await db.channel.findUnique({
      where: { id: channelId },
      select: {
        groupId: true,
        group: {
          select: {
            memberships: {
              where: { userId: user.id },
              select: { id: true },
            },
          },
        },
      },
    });

    if (!channel) {
      return NextResponse.json({ error: "Channel introuvable" }, { status: 404 });
    }

    const isMember = channel.group.memberships.length > 0;

    if (!isMember && !isPlatformStaff) {
      return NextResponse.json({ error: "Pas membre" }, { status: 403 });
    }

    const authResponse = pusher.authorizeChannel(socketId, channelName);
    return NextResponse.json(authResponse);
  }

  // ============================
  // Channel de présence : presence-group-<id>
  // ============================
  if (channelName.startsWith("presence-group-")) {
    const groupId = channelName.replace("presence-group-", "");

    const membership = await db.groupMembership.findUnique({
      where: { userId_groupId: { userId: user.id, groupId } },
      select: { id: true },
    });

    if (!membership && !isPlatformStaff) {
      return NextResponse.json({ error: "Pas membre de ce groupe" }, { status: 403 });
    }

    // ADMIN invisible : on REFUSE l'abonnement au presence channel
    // → il ne sera pas dans la liste des "membres en ligne" côté client
    if (user.isInvisible && user.role === "ADMIN") {
      return NextResponse.json(
        { error: "Mode invisible activé" },
        { status: 403 }
      );
    }

    const authResponse = pusher.authorizeChannel(socketId, channelName, {
      user_id: user.id,
      user_info: {
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
    });
    return NextResponse.json(authResponse);
  }

  // Notifications perso
  if (channelName === `private-user-${user.id}`) {
    const authResponse = pusher.authorizeChannel(socketId, channelName);
    return NextResponse.json(authResponse);
  }

  return NextResponse.json({ error: "Channel non autorisé" }, { status: 403 });
}
