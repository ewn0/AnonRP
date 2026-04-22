// POST /api/channels/[id]/mark-read
// Marque un channel comme lu jusqu'au message le plus récent
// Appelé quand l'user scroll en bas du chat

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { id: channelId } = await params;

  // Vérifie que le channel existe et que l'user y a accès
  const channel = await db.channel.findUnique({
    where: { id: channelId },
    select: {
      id: true,
      group: {
        select: {
          memberships: { where: { userId: session.user.id }, select: { id: true } },
        },
      },
    },
  });

  if (!channel) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  // Bypass staff plateforme
  const me = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  const isStaff = me?.role === "ADMIN" || me?.role === "MODERATOR";

  if (channel.group.memberships.length === 0 && !isStaff) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  // Récupère le dernier message du channel pour enregistrer son ID
  const lastMessage = await db.channelMessage.findFirst({
    where: { channelId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  const now = new Date();

  await db.channelReadState.upsert({
    where: { userId_channelId: { userId: session.user.id, channelId } },
    create: {
      userId: session.user.id,
      channelId,
      lastReadAt: now,
      lastReadMessageId: lastMessage?.id,
    },
    update: {
      lastReadAt: now,
      lastReadMessageId: lastMessage?.id,
    },
  });

  return NextResponse.json({ ok: true, lastReadAt: now });
}
