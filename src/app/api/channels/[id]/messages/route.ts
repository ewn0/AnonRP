// Routes /api/channels/[id]/messages
// GET  → historique (avec pagination) + isGiftSystem
// POST → envoyer un message (+ gain XP/coins + mentions + reply + Pusher)

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { pusher, pusherChannels, pusherEvents } from "@/lib/pusher";
import { processMessageReward } from "@/lib/xp";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const MESSAGE_SELECT = {
  id: true,
  content: true,
  createdAt: true,
  isEdited: true,
  editedAt: true,
  isDeleted: true,
  deletedReason: true,
  replyToId: true,
  isGiftSystem: true,
  giftId: true,
  replyTo: {
    select: {
      id: true, content: true, isDeleted: true,
      author: { select: { username: true, displayName: true } },
    },
  },
  author: {
    select: {
      id: true, username: true, displayName: true, avatarUrl: true,
      level: true, role: true, premiumTier: true,
    },
  },
} as const;

export async function GET(req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  }

  const { id: channelId } = await params;
  const searchParams = req.nextUrl.searchParams;
  const before = searchParams.get("before");
  const limit = Math.min(100, Math.max(10, parseInt(searchParams.get("limit") ?? "50", 10)));

  const channel = await db.channel.findUnique({
    where: { id: channelId },
    select: {
      id: true, isDeleted: true,
      group: {
        select: {
          id: true,
          memberships: { where: { userId: session.user.id }, select: { id: true } },
        },
      },
    },
  });

  if (!channel || channel.isDeleted) {
    return NextResponse.json({ error: "Channel introuvable" }, { status: 404 });
  }

  // Bypass staff plateforme
  const platformUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  const isPlatformStaff = platformUser?.role === "ADMIN" || platformUser?.role === "MODERATOR";

  if (channel.group.memberships.length === 0 && !isPlatformStaff) {
    return NextResponse.json({ error: "Pas membre" }, { status: 403 });
  }

  const where: any = { channelId };
  if (before) {
    const ref = await db.channelMessage.findUnique({
      where: { id: before },
      select: { createdAt: true },
    });
    if (ref) where.createdAt = { lt: ref.createdAt };
  }

  const messages = await db.channelMessage.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: MESSAGE_SELECT,
  });

  return NextResponse.json({ messages: messages.reverse() });
}

const postSchema = z.object({
  content: z.string().trim().min(1).max(4000),
  replyToId: z.string().optional(),
});

function extractMentions(content: string): string[] {
  const matches = content.matchAll(/@([a-zA-Z0-9_-]{3,20})/g);
  const usernames = new Set<string>();
  for (const m of matches) usernames.add(m[1]);
  return Array.from(usernames).slice(0, 10);
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  }

  const { id: channelId } = await params;
  const body = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Message invalide" }, { status: 400 });
  }

  const channel = await db.channel.findUnique({
    where: { id: channelId },
    select: {
      id: true, isDeleted: true, isLocked: true, writePermission: true, groupId: true,
      group: {
        select: {
          id: true, name: true, slug: true,
          memberships: {
            where: { userId: session.user.id },
            select: { role: true, mutedUntil: true },
          },
        },
      },
    },
  });

  if (!channel || channel.isDeleted) {
    return NextResponse.json({ error: "Channel introuvable" }, { status: 404 });
  }
  if (channel.isLocked) {
    return NextResponse.json({ error: "Channel verrouillé" }, { status: 403 });
  }

  const membership = channel.group.memberships[0];
  if (!membership) {
    return NextResponse.json({ error: "Pas membre" }, { status: 403 });
  }
  if (membership.mutedUntil && membership.mutedUntil > new Date()) {
    return NextResponse.json(
      { error: `Muté jusqu'à ${membership.mutedUntil.toLocaleString("fr-FR")}` },
      { status: 403 }
    );
  }

  const platformUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      role: true, isBanned: true, username: true, displayName: true,
      avatarUrl: true, level: true, premiumTier: true,
    },
  });

  if (!platformUser || platformUser.isBanned) {
    return NextResponse.json({ error: "Compte bloqué" }, { status: 403 });
  }

  const isPlatformAdmin = platformUser.role === "ADMIN";
  const isMod = membership.role === "MODERATOR" || membership.role === "ADMIN" || isPlatformAdmin;

  if (channel.writePermission === "READ_ONLY" && !isPlatformAdmin) {
    return NextResponse.json({ error: "Channel en lecture seule" }, { status: 403 });
  }
  if (channel.writePermission === "MODS_ONLY" && !isMod) {
    return NextResponse.json({ error: "Réservé aux modérateurs" }, { status: 403 });
  }

  let replyToData: {
    authorId: string; content: string;
    authorUsername: string; authorDisplayName: string | null;
  } | null = null;

  if (parsed.data.replyToId) {
    const replyTarget = await db.channelMessage.findUnique({
      where: { id: parsed.data.replyToId },
      select: {
        channelId: true, isDeleted: true, authorId: true, content: true,
        author: { select: { username: true, displayName: true } },
      },
    });
    if (!replyTarget || replyTarget.channelId !== channelId || replyTarget.isDeleted) {
      return NextResponse.json({ error: "Message cible introuvable" }, { status: 400 });
    }
    replyToData = {
      authorId: replyTarget.authorId,
      content: replyTarget.content,
      authorUsername: replyTarget.author.username,
      authorDisplayName: replyTarget.author.displayName,
    };
  }

  const content = parsed.data.content.trim();
  const mentionedUsernames = extractMentions(content);
  const mentionedUsers = mentionedUsernames.length > 0
    ? await db.user.findMany({
        where: {
          username: { in: mentionedUsernames, mode: "insensitive" },
          isBanned: false,
        },
        select: { id: true, username: true },
      })
    : [];

  const { message, reward, mentionEntries } = await db.$transaction(async (tx) => {
    const msg = await tx.channelMessage.create({
      data: {
        channelId, authorId: session.user.id, content,
        replyToId: parsed.data.replyToId,
      },
      select: {
        id: true, content: true, createdAt: true,
        isEdited: true, replyToId: true, isGiftSystem: true, giftId: true,
      },
    });

    const mentionEntries = mentionedUsers.filter((u) => u.id !== session.user.id);
    if (mentionEntries.length > 0) {
      await tx.channelMessageMention.createMany({
        data: mentionEntries.map((u) => ({
          messageId: msg.id, mentionedUserId: u.id,
        })),
        skipDuplicates: true,
      });

      await tx.systemNotification.createMany({
        data: mentionEntries.map((u) => ({
          userId: u.id, type: "MESSAGE_MENTION" as const,
          title: `${platformUser.displayName || platformUser.username} t'a mentionné(e)`,
          content: content.slice(0, 200),
          linkUrl: `/g/${channel.group.slug}`,
          metadata: {
            channelId, groupId: channel.groupId, messageId: msg.id,
            fromUsername: platformUser.username,
          },
        })),
      });
    }

    if (replyToData && replyToData.authorId !== session.user.id) {
      const alreadyMentioned = mentionEntries.some((m) => m.id === replyToData!.authorId);
      if (!alreadyMentioned) {
        await tx.systemNotification.create({
          data: {
            userId: replyToData.authorId,
            type: "MESSAGE_REPLY",
            title: `${platformUser.displayName || platformUser.username} a répondu à ton message`,
            content: content.slice(0, 200),
            linkUrl: `/g/${channel.group.slug}`,
            metadata: {
              channelId, groupId: channel.groupId, messageId: msg.id,
              fromUsername: platformUser.username,
            },
          },
        });
      }
    }

    await tx.group.update({
      where: { id: channel.groupId },
      data: { activityScore: { increment: 0.5 } },
    });

    const reward = await processMessageReward(session.user.id, content, tx);
    return { message: msg, reward, mentionEntries };
  });

  const messageForBroadcast = {
    ...message,
    author: {
      id: session.user.id,
      username: platformUser.username,
      displayName: platformUser.displayName,
      avatarUrl: platformUser.avatarUrl,
      level: platformUser.level,
      role: platformUser.role,
      premiumTier: platformUser.premiumTier,
    },
    replyTo: replyToData
      ? {
          id: parsed.data.replyToId,
          content: replyToData.content,
          author: {
            username: replyToData.authorUsername,
            displayName: replyToData.authorDisplayName,
          },
        }
      : null,
  };

  try {
    await pusher.trigger(
      pusherChannels.channelChat(channelId),
      pusherEvents.MESSAGE_NEW,
      messageForBroadcast
    );
  } catch (e) {
    console.error("Pusher trigger failed:", e);
  }

  return NextResponse.json({
    success: true,
    message: messageForBroadcast,
    reward,
    mentionsCount: mentionEntries.length,
  });
}
