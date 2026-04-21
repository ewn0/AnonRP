// Route /api/channels/[id]
// DELETE → supprimer un channel (soft-delete, modo/admin seulement)

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { pusher, pusherChannels, pusherEvents } from "@/lib/pusher";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  }

  const { id: channelId } = await params;

  const channel = await db.channel.findUnique({
    where: { id: channelId },
    select: {
      id: true,
      name: true,
      isSystem: true,
      groupId: true,
      group: {
        select: {
          slug: true,
          memberships: {
            where: { userId: session.user.id },
            select: { role: true },
          },
        },
      },
    },
  });

  if (!channel) {
    return NextResponse.json({ error: "Channel introuvable" }, { status: 404 });
  }

  // Les channels système (ex: "général") ne peuvent pas être supprimés
  if (channel.isSystem) {
    return NextResponse.json(
      { error: "Les channels système ne peuvent pas être supprimés" },
      { status: 403 }
    );
  }

  const platformUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  const groupRole = channel.group.memberships[0]?.role;
  const canManage =
    groupRole === "MODERATOR" ||
    groupRole === "ADMIN" ||
    platformUser?.role === "ADMIN";

  if (!canManage) {
    return NextResponse.json({ error: "Permissions insuffisantes" }, { status: 403 });
  }

  // Soft-delete (on garde les données pour audit, mais le channel n'apparaîtra plus)
  await db.channel.update({
    where: { id: channelId },
    data: { isDeleted: true },
  });

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "CHANNEL_DELETED",
      targetType: "CHANNEL",
      targetId: channelId,
      metadata: { groupId: channel.groupId, name: channel.name },
    },
  });

  // Notifier les clients
  try {
    await pusher.trigger(
      pusherChannels.groupPresence(channel.groupId),
      pusherEvents.CHANNEL_DELETED,
      { channelId, groupSlug: channel.group.slug }
    );
  } catch (e) {
    console.error("Pusher trigger failed:", e);
  }

  return NextResponse.json({ success: true });
}
