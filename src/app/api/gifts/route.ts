// POST /api/gifts
// Envoi d'un cadeau d'un user à un autre
// - Si channelId fourni : créé un ChannelMessage avec isGiftSystem=true (persiste en BDD)
// - Puis diffuse via Pusher (message:new) pour temps réel
// - Les messages système sont donc traités comme des messages normaux pour l'historique/non-lus

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import { pusher, pusherChannels, pusherEvents } from "@/lib/pusher";

const sendSchema = z.object({
  receiverId: z.string().min(1),
  giftTypeSlug: z.string().min(1).max(30),
  message: z.string().max(200).optional(),
  channelId: z.string().optional(),
});

const MAX_BOOST_PERCENT = 0.20;

// ID spécial "bot AnonRP" pour les messages système.
// On peut y mettre l'ID de l'admin initial, mais proprement on devrait avoir un user "system".
// Ici on utilise un fallback : le sender lui-même comme author du ChannelMessage (mais avec flag isGiftSystem).
// Ça évite de créer un user fictif tout en marquant clairement le type de message.

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  }

  const rl = await checkRateLimit({
    identifier: session.user.id,
    action: "send_gift",
    maxAttempts: 20,
    windowSeconds: 3600,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Limite de cadeaux atteinte, réessaie dans 1h" },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { receiverId, giftTypeSlug, message, channelId } = parsed.data;

  if (receiverId === session.user.id) {
    return NextResponse.json({ error: "Tu ne peux pas t'offrir un cadeau à toi-même" }, { status: 400 });
  }

  const [sender, receiver, giftType] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true, username: true, displayName: true, avatarUrl: true,
        coins: true, isBanned: true, level: true, role: true, premiumTier: true,
      },
    }),
    db.user.findUnique({
      where: { id: receiverId },
      select: { id: true, username: true, displayName: true, isBanned: true, xpBoostPercent: true },
    }),
    db.giftType.findUnique({
      where: { slug: giftTypeSlug },
      select: { id: true, slug: true, name: true, costCoins: true, xpBoostPercent: true, isActive: true },
    }),
  ]);

  if (!sender) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 401 });
  if (sender.isBanned) return NextResponse.json({ error: "Compte bloqué" }, { status: 403 });
  if (!receiver) return NextResponse.json({ error: "Destinataire introuvable" }, { status: 404 });
  if (receiver.isBanned) return NextResponse.json({ error: "Impossible d'offrir à un compte banni" }, { status: 403 });
  if (!giftType || !giftType.isActive) return NextResponse.json({ error: "Ce cadeau n'existe pas" }, { status: 404 });

  if (sender.coins < giftType.costCoins) {
    return NextResponse.json(
      { error: `Pas assez de coins (tu as ${sender.coins}, ce cadeau coûte ${giftType.costCoins})` },
      { status: 400 }
    );
  }

  // Vérifier le channel si fourni
  let channelData: { id: string; groupId: string; groupSlug: string; channelName: string } | null = null;
  if (channelId) {
    const channel = await db.channel.findUnique({
      where: { id: channelId },
      select: {
        id: true, name: true, isDeleted: true, isLocked: true, groupId: true,
        group: {
          select: {
            slug: true,
            memberships: { where: { userId: session.user.id }, select: { id: true } },
          },
        },
      },
    });

    if (!channel || channel.isDeleted || channel.isLocked) {
      return NextResponse.json({ error: "Channel invalide" }, { status: 400 });
    }
    if (channel.group.memberships.length === 0) {
      return NextResponse.json({ error: "Pas membre de ce groupe" }, { status: 403 });
    }

    channelData = {
      id: channel.id,
      groupId: channel.groupId,
      groupSlug: channel.group.slug,
      channelName: channel.name,
    };
  }

  const newBoostPercent = Math.min(
    receiver.xpBoostPercent + giftType.xpBoostPercent,
    MAX_BOOST_PERCENT
  );
  const actualBoostGained = newBoostPercent - receiver.xpBoostPercent;

  const { gift, systemMessage } = await db.$transaction(async (tx) => {
    const updatedSender = await tx.user.update({
      where: { id: sender.id },
      data: { coins: { decrement: giftType.costCoins } },
      select: { coins: true },
    });

    if (actualBoostGained > 0) {
      await tx.user.update({
        where: { id: receiver.id },
        data: { xpBoostPercent: newBoostPercent },
      });
    }

    const gift = await tx.gift.create({
      data: {
        giftTypeId: giftType.id,
        senderId: sender.id,
        receiverId: receiver.id,
        message: message || undefined,
        channelId: channelData?.id,
      },
      select: { id: true, createdAt: true },
    });

    await tx.coinTransaction.create({
      data: {
        userId: sender.id,
        amount: -giftType.costCoins,
        balance: updatedSender.coins,
        type: "GIFT_SENT",
        metadata: {
          giftId: gift.id, giftSlug: giftType.slug,
          receiverId: receiver.id, receiverUsername: receiver.username,
        },
      },
    });

    await tx.systemNotification.create({
      data: {
        userId: receiver.id,
        type: "GIFT_RECEIVED",
        title: `Tu as reçu ${giftType.name} 🎁`,
        content: channelData
          ? `${sender.displayName || sender.username} t'a offert ${giftType.name} dans un channel !`
          : `Quelqu'un t'a offert ${giftType.name}${message ? ` avec un message : "${message}"` : ""} !`,
        linkUrl: `/u/${receiver.username}`,
        metadata: {
          giftId: gift.id, giftSlug: giftType.slug, boostGained: actualBoostGained,
          senderId: channelData ? sender.id : null,
          senderUsername: channelData ? sender.username : null,
        },
      },
    });

    // Persister le message système en BDD si envoi depuis channel
    let systemMessage = null;
    if (channelData) {
      const senderName = sender.displayName || sender.username;
      const receiverName = receiver.displayName || receiver.username;
      const giftEmoji = giftEmojiFromSlug(giftType.slug);
      const messageContent = `🎁 **${senderName}** a offert ${giftEmoji} **${giftType.name}** à **${receiverName}** !`;

      systemMessage = await tx.channelMessage.create({
        data: {
          channelId: channelData.id,
          authorId: sender.id,
          content: messageContent,
          isGiftSystem: true,
          giftId: gift.id,
          countsForCoins: false,
        },
        select: {
          id: true,
          content: true,
          createdAt: true,
          isEdited: true,
          isGiftSystem: true,
          giftId: true,
          replyToId: true,
        },
      });
    }

    return { gift, systemMessage };
  });

  // Broadcast via Pusher : on utilise MESSAGE_NEW pour que tous les clients actuels le voient
  // et pour qu'il soit intégré dans l'historique temps réel comme les autres messages.
  if (channelData && systemMessage) {
    try {
      const messageForBroadcast = {
        ...systemMessage,
        author: {
          id: sender.id,
          username: sender.username,
          displayName: sender.displayName,
          avatarUrl: sender.avatarUrl,
          level: sender.level,
          role: sender.role,
          premiumTier: sender.premiumTier,
        },
        replyTo: null,
        isDeleted: false,
      };

      await pusher.trigger(
        pusherChannels.channelChat(channelData.id),
        pusherEvents.MESSAGE_NEW,
        messageForBroadcast
      );
    } catch (e) {
      console.error("Pusher broadcast failed:", e);
    }
  }

  return NextResponse.json({
    success: true,
    giftId: gift.id,
    boostGained: actualBoostGained,
    newSenderCoins: sender.coins - giftType.costCoins,
  });
}

function giftEmojiFromSlug(slug: string): string {
  const map: Record<string, string> = {
    rose: "🌹", teddy: "🧸", star: "⭐", heart: "❤️",
    diamond: "💎", crown: "👑", dragon: "🐉",
  };
  return map[slug] ?? "🎁";
}
