// Routes /api/channels/[id]/messages/[messageId]
// PATCH  → éditer son propre message (fenêtre 15 min)
// DELETE → supprimer (auteur / modo groupe / admin plateforme)

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { pusher, pusherChannels, pusherEvents } from "@/lib/pusher";
import { deleteMessageSchema } from "@/lib/validations/moderation";

const editSchema = z.object({
  content: z.string().trim().min(1).max(4000),
});

const EDIT_WINDOW_MINUTES = 15;

interface RouteParams {
  params: Promise<{ id: string; messageId: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  }

  const { id: channelId, messageId } = await params;
  const body = await req.json().catch(() => null);
  const parsed = editSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Message invalide", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const message = await db.channelMessage.findUnique({
    where: { id: messageId },
    select: {
      id: true,
      channelId: true,
      authorId: true,
      content: true,
      createdAt: true,
      isDeleted: true,
    },
  });

  if (!message || message.channelId !== channelId) {
    return NextResponse.json({ error: "Message introuvable" }, { status: 404 });
  }

  if (message.authorId !== session.user.id) {
    return NextResponse.json({ error: "Tu ne peux éditer que tes propres messages" }, { status: 403 });
  }

  if (message.isDeleted) {
    return NextResponse.json({ error: "Message supprimé" }, { status: 400 });
  }

  const ageMinutes = (Date.now() - message.createdAt.getTime()) / 60000;
  if (ageMinutes > EDIT_WINDOW_MINUTES) {
    return NextResponse.json(
      { error: `Trop tard pour éditer (limite : ${EDIT_WINDOW_MINUTES} min)` },
      { status: 400 }
    );
  }

  const newContent = parsed.data.content.trim();
  if (newContent === message.content) {
    return NextResponse.json({ success: true, noChange: true });
  }

  const now = new Date();
  const updated = await db.channelMessage.update({
    where: { id: messageId },
    data: {
      content: newContent,
      isEdited: true,
      editedAt: now,
    },
    select: { id: true, content: true, isEdited: true, editedAt: true },
  });

  try {
    await pusher.trigger(
      pusherChannels.channelChat(channelId),
      pusherEvents.MESSAGE_EDITED,
      { messageId: updated.id, content: updated.content, editedAt: updated.editedAt }
    );
  } catch (e) {
    console.error("Pusher broadcast failed:", e);
  }

  return NextResponse.json({ success: true, message: updated });
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  }

  const { id: channelId, messageId } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = deleteMessageSchema.safeParse(body);
  const reason = parsed.success ? parsed.data.reason : undefined;

  const message = await db.channelMessage.findUnique({
    where: { id: messageId },
    select: {
      id: true,
      channelId: true,
      authorId: true,
      content: true,
      isDeleted: true,
      author: { select: { role: true, username: true } },
      channel: {
        select: {
          groupId: true,
          group: {
            select: {
              memberships: {
                where: { userId: session.user.id },
                select: { role: true },
              },
            },
          },
        },
      },
    },
  });

  if (!message || message.channelId !== channelId) {
    return NextResponse.json({ error: "Message introuvable" }, { status: 404 });
  }

  if (message.isDeleted) {
    return NextResponse.json({ error: "Déjà supprimé" }, { status: 400 });
  }

  const platformUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  const isPlatformAdmin = platformUser?.role === "ADMIN";
  const isPlatformMod = platformUser?.role === "MODERATOR";
  const groupRole = message.channel.group.memberships[0]?.role;
  const isGroupMod = groupRole === "MODERATOR" || groupRole === "ADMIN";
  const isSelfDelete = message.authorId === session.user.id;

  if (isSelfDelete) {
    // OK
  } else if (isPlatformAdmin || isGroupMod || isPlatformMod) {
    if (!isPlatformAdmin && message.author.role === "ADMIN") {
      return NextResponse.json(
        { error: "Impossible de supprimer le message d'un admin" },
        { status: 403 }
      );
    }
  } else {
    return NextResponse.json({ error: "Permissions insuffisantes" }, { status: 403 });
  }

  await db.channelMessage.update({
    where: { id: messageId },
    data: {
      isDeleted: true,
      deletedById: session.user.id,
      deletedAt: new Date(),
      deletedReason: reason,
    },
  });

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: isSelfDelete ? "MESSAGE_DELETED_BY_AUTHOR" : "MESSAGE_DELETED_BY_MOD",
      targetType: "CHANNEL_MESSAGE",
      targetId: messageId,
      metadata: { channelId, groupId: message.channel.groupId, authorId: message.authorId, reason },
    },
  });

  if (!isSelfDelete) {
    await db.systemNotification.create({
      data: {
        userId: message.authorId,
        type: "MESSAGE_DELETED_BY_MOD",
        title: "Un de tes messages a été supprimé",
        content: reason ? `Raison donnée : "${reason}"` : "Un modérateur a supprimé un de tes messages.",
        metadata: {
          channelId,
          groupId: message.channel.groupId,
          excerpt: message.content.slice(0, 100),
        },
      },
    });
  }

  try {
    await pusher.trigger(
      pusherChannels.channelChat(channelId),
      pusherEvents.MESSAGE_DELETED,
      { messageId, by: session.user.id, reason }
    );
  } catch (e) {
    console.error("Pusher broadcast failed:", e);
  }

  return NextResponse.json({ success: true });
}
