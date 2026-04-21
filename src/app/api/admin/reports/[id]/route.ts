// POST /api/admin/reports/[id]
// Actions d'admin/modo sur un signalement : résoudre / rejeter / supprimer le message cible

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { pusher, pusherChannels, pusherEvents } from "@/lib/pusher";

const actionSchema = z.object({
  action: z.enum(["resolve", "dismiss", "delete_and_resolve"]),
  note: z.string().max(500).optional(),
});

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
  if (me?.role !== "ADMIN" && me?.role !== "MODERATOR") {
    return NextResponse.json({ error: "Permissions insuffisantes" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Action invalide" }, { status: 400 });
  }

  const report = await db.report.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      targetType: true,
      targetId: true,
      reporterId: true,
      reportedUserId: true,
    },
  });

  if (!report) {
    return NextResponse.json({ error: "Signalement introuvable" }, { status: 404 });
  }

  if (report.status !== "PENDING" && report.status !== "INVESTIGATING") {
    return NextResponse.json({ error: "Déjà traité" }, { status: 400 });
  }

  const now = new Date();

  // Action : supprimer le message signalé ET résoudre
  if (parsed.data.action === "delete_and_resolve") {
    if (report.targetType !== "CHANNEL_MESSAGE") {
      return NextResponse.json({ error: "Le message n'est pas supprimable" }, { status: 400 });
    }

    const message = await db.channelMessage.findUnique({
      where: { id: report.targetId },
      select: {
        id: true,
        channelId: true,
        authorId: true,
        content: true,
        isDeleted: true,
        author: { select: { role: true } },
      },
    });

    if (!message) {
      return NextResponse.json({ error: "Message introuvable" }, { status: 404 });
    }

    // Un MOD plateforme ne peut pas supprimer le message d'un ADMIN plateforme
    if (me.role === "MODERATOR" && message.author.role === "ADMIN") {
      return NextResponse.json(
        { error: "Impossible de supprimer le message d'un admin" },
        { status: 403 }
      );
    }

    if (!message.isDeleted) {
      await db.channelMessage.update({
        where: { id: message.id },
        data: {
          isDeleted: true,
          deletedById: session.user.id,
          deletedAt: now,
          deletedReason: `Suppression suite à signalement #${report.id}`,
        },
      });

      // Notifier l'auteur
      await db.systemNotification.create({
        data: {
          userId: message.authorId,
          type: "MESSAGE_DELETED_BY_MOD",
          title: "Un de tes messages a été supprimé",
          content: "Un modérateur a supprimé un de tes messages suite à un signalement.",
          metadata: { channelId: message.channelId, reportId: report.id },
        },
      });

      // Diffuser via Pusher
      try {
        await pusher.trigger(
          pusherChannels.channelChat(message.channelId),
          pusherEvents.MESSAGE_DELETED,
          { messageId: message.id, by: session.user.id }
        );
      } catch (e) {
        console.error("Pusher broadcast failed:", e);
      }
    }
  }

  // Mettre à jour le statut du signalement
  const newStatus = parsed.data.action === "dismiss" ? "DISMISSED" : "RESOLVED";

  await db.report.update({
    where: { id: report.id },
    data: {
      status: newStatus,
      handledByUserId: session.user.id,
      handledAt: now,
      resolution: parsed.data.note,
    },
  });

  // Notifier le reporter
  await db.systemNotification.create({
    data: {
      userId: report.reporterId,
      type: "REPORT_HANDLED",
      title: "Ton signalement a été traité",
      content:
        newStatus === "RESOLVED"
          ? "Merci ! Ton signalement a été examiné et des mesures ont été prises."
          : "Ton signalement a été examiné mais aucune violation n'a été constatée.",
      metadata: { reportId: report.id, status: newStatus },
    },
  });

  // Audit log
  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "REPORT_HANDLED",
      targetType: "REPORT",
      targetId: report.id,
      metadata: { action: parsed.data.action, status: newStatus },
    },
  });

  return NextResponse.json({ success: true, status: newStatus });
}
