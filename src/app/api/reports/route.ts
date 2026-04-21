// POST /api/reports
// Crée un signalement sur un message (ou autre cible)

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { reportMessageSchema } from "@/lib/validations/moderation";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  }

  // Rate limit anti-troll : 5 signalements max par heure
  const limit = await checkRateLimit({
    identifier: session.user.id,
    action: "report",
    maxAttempts: 5,
    windowSeconds: 3600,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Trop de signalements, réessaie dans 1h" },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = reportMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { messageId, reason, description } = parsed.data;

  // Charger le message pour vérifier existence et auteur
  const message = await db.channelMessage.findUnique({
    where: { id: messageId },
    select: {
      id: true,
      authorId: true,
      isDeleted: true,
      channel: {
        select: {
          groupId: true,
          group: { select: { slug: true } },
        },
      },
    },
  });

  if (!message || message.isDeleted) {
    return NextResponse.json({ error: "Message introuvable" }, { status: 404 });
  }

  // Empêcher auto-signalement
  if (message.authorId === session.user.id) {
    return NextResponse.json(
      { error: "Tu ne peux pas te signaler toi-même" },
      { status: 400 }
    );
  }

  // Vérifier qu'un signalement du même reporter sur le même message n'existe pas déjà
  const existing = await db.report.findFirst({
    where: {
      reporterId: session.user.id,
      targetType: "CHANNEL_MESSAGE",
      targetId: messageId,
    },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Tu as déjà signalé ce message" },
      { status: 400 }
    );
  }

  const report = await db.report.create({
    data: {
      reporterId: session.user.id,
      reportedUserId: message.authorId,
      targetType: "CHANNEL_MESSAGE",
      targetId: messageId,
      reason,
      description,
    },
    select: { id: true },
  });

  // Audit log
  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "REPORT_CREATED",
      targetType: "CHANNEL_MESSAGE",
      targetId: messageId,
      metadata: { reason, reportId: report.id },
    },
  });

  // Détection des signalements multiples (3 reporters distincts en 1h sur même user)
  // -> notification prioritaire des admins
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentReports = await db.report.findMany({
    where: {
      reportedUserId: message.authorId,
      createdAt: { gte: oneHourAgo },
    },
    select: { reporterId: true },
  });
  const uniqueReporters = new Set(recentReports.map((r) => r.reporterId));

  if (uniqueReporters.size >= 3) {
    // Créer une notif pour tous les admins plateforme
    const admins = await db.user.findMany({
      where: { role: "ADMIN", isBanned: false },
      select: { id: true },
    });

    await db.systemNotification.createMany({
      data: admins.map((a) => ({
        userId: a.id,
        type: "ADMIN_MESSAGE" as const,
        title: "⚠️ Signalements multiples",
        content: `Un utilisateur vient de recevoir ${uniqueReporters.size} signalements distincts en moins d'une heure. À examiner en priorité.`,
        metadata: {
          reportedUserId: message.authorId,
          reportCount: uniqueReporters.size,
        },
      })),
    });
  }

  // Webhook Discord (si configuré)
  // On le tente de façon non-bloquante
  try {
    const webhookUrl = process.env.DISCORD_REPORTS_WEBHOOK_URL;
    if (webhookUrl) {
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      const transcriptUrl = `${baseUrl}/admin/reports/${report.id}`;

      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embeds: [
            {
              title: "🚩 Nouveau signalement",
              color: 0xff4d4d,
              fields: [
                { name: "Motif", value: reason, inline: true },
                { name: "Groupe", value: message.channel.group.slug, inline: true },
                { name: "Retranscription", value: transcriptUrl },
                ...(description ? [{ name: "Description", value: description.slice(0, 1000) }] : []),
              ],
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      });

      await db.report.update({
        where: { id: report.id },
        data: { transcriptUrl },
      });
    }
  } catch (e) {
    console.error("Discord webhook failed:", e);
  }

  return NextResponse.json({ success: true, reportId: report.id });
}
