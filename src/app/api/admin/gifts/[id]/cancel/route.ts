// POST /api/admin/gifts/[id]/cancel
// Annule un cadeau (ADMIN seulement, dans les 24h)
// Rembourse le sender, retire le boost XP du receiver

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

const CANCEL_WINDOW_HOURS = 24;

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  }

  const me = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (me?.role !== "ADMIN") {
    return NextResponse.json({ error: "ADMIN seulement" }, { status: 403 });
  }

  const { id: giftId } = await params;
  const body = await req.json().catch(() => ({}));
  const reason = typeof body?.reason === "string" ? body.reason.slice(0, 300) : undefined;

  const gift = await db.gift.findUnique({
    where: { id: giftId },
    select: {
      id: true,
      senderId: true,
      receiverId: true,
      createdAt: true,
      cancelledAt: true,
      isRefunded: true,
      giftType: {
        select: { slug: true, name: true, costCoins: true, xpBoostPercent: true },
      },
      sender: { select: { username: true } },
      receiver: { select: { username: true, xpBoostPercent: true } },
    },
  });

  if (!gift) {
    return NextResponse.json({ error: "Cadeau introuvable" }, { status: 404 });
  }
  if (gift.cancelledAt) {
    return NextResponse.json({ error: "Déjà annulé" }, { status: 400 });
  }

  // Vérifier délai 24h
  const ageHours = (Date.now() - gift.createdAt.getTime()) / (1000 * 60 * 60);
  if (ageHours > CANCEL_WINDOW_HOURS) {
    return NextResponse.json(
      { error: `Trop tard, la fenêtre d'annulation est de ${CANCEL_WINDOW_HOURS}h` },
      { status: 400 }
    );
  }

  const now = new Date();
  const newReceiverBoost = Math.max(
    0,
    gift.receiver.xpBoostPercent - gift.giftType.xpBoostPercent
  );

  await db.$transaction(async (tx) => {
    // Marquer cadeau comme annulé
    await tx.gift.update({
      where: { id: gift.id },
      data: {
        cancelledAt: now,
        cancelledByUserId: session.user.id,
        isRefunded: true,
      },
    });

    // Rembourser sender
    const updatedSender = await tx.user.update({
      where: { id: gift.senderId },
      data: { coins: { increment: gift.giftType.costCoins } },
      select: { coins: true },
    });

    // Retirer boost du receiver
    await tx.user.update({
      where: { id: gift.receiverId },
      data: { xpBoostPercent: newReceiverBoost },
    });

    // CoinTransaction remboursement
    await tx.coinTransaction.create({
      data: {
        userId: gift.senderId,
        amount: gift.giftType.costCoins,
        balance: updatedSender.coins,
        type: "REFUND",
        metadata: { giftId: gift.id, adminId: session.user.id, reason },
      },
    });

    // Notifications
    await tx.systemNotification.create({
      data: {
        userId: gift.senderId,
        type: "ADMIN_MESSAGE",
        title: "Cadeau remboursé",
        content: `Ton envoi de ${gift.giftType.name} à @${gift.receiver.username} a été annulé par un administrateur. Tu as récupéré ${gift.giftType.costCoins} coins.${reason ? ` Raison : ${reason}` : ""}`,
      },
    });

    await tx.systemNotification.create({
      data: {
        userId: gift.receiverId,
        type: "ADMIN_MESSAGE",
        title: "Cadeau annulé",
        content: `Le cadeau ${gift.giftType.name} que tu avais reçu a été annulé par un administrateur.${reason ? ` Raison : ${reason}` : ""}`,
      },
    });

    // Audit log
    await tx.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "GIFT_CANCELLED",
        targetType: "GIFT",
        targetId: gift.id,
        metadata: {
          giftSlug: gift.giftType.slug,
          senderId: gift.senderId,
          receiverId: gift.receiverId,
          reason,
        },
      },
    });
  });

  return NextResponse.json({ success: true });
}
