// POST /api/groups/[slug]/requests/[id]
// Accepter ou refuser une demande de rejoindre le groupe

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

const actionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  note: z.string().max(300).optional(),
});

interface RouteParams {
  params: Promise<{ slug: string; id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  }

  const { slug, id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Action invalide" }, { status: 400 });
  }

  const group = await db.group.findUnique({
    where: { slug },
    select: {
      id: true,
      ownerId: true,
      name: true,
      memberships: {
        where: { userId: session.user.id },
        select: { role: true },
      },
    },
  });

  if (!group) {
    return NextResponse.json({ error: "Groupe introuvable" }, { status: 404 });
  }

  const platformUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  const groupRole = group.memberships[0]?.role;
  const canManage =
    group.ownerId === session.user.id ||
    groupRole === "MODERATOR" ||
    groupRole === "ADMIN" ||
    platformUser?.role === "ADMIN";

  if (!canManage) {
    return NextResponse.json({ error: "Permissions insuffisantes" }, { status: 403 });
  }

  const request = await db.groupJoinRequest.findUnique({
    where: { id },
    select: {
      id: true,
      groupId: true,
      userId: true,
      status: true,
    },
  });

  if (!request || request.groupId !== group.id) {
    return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
  }

  if (request.status !== "PENDING") {
    return NextResponse.json({ error: "Demande déjà traitée" }, { status: 400 });
  }

  const now = new Date();

  if (parsed.data.action === "approve") {
    // Créer la membership + marquer la demande comme approuvée + incrémenter memberCount
    await db.$transaction([
      db.groupJoinRequest.update({
        where: { id: request.id },
        data: {
          status: "APPROVED",
          reviewedBy: session.user.id,
          reviewedAt: now,
        },
      }),
      db.groupMembership.upsert({
        where: { userId_groupId: { userId: request.userId, groupId: group.id } },
        create: {
          userId: request.userId,
          groupId: group.id,
          role: "MEMBER",
        },
        update: {},
      }),
      db.group.update({
        where: { id: group.id },
        data: { memberCount: { increment: 1 } },
      }),
      db.systemNotification.create({
        data: {
          userId: request.userId,
          type: "JOIN_REQUEST_APPROVED",
          title: `Bienvenue dans ${group.name} !`,
          content: `Ta demande pour rejoindre "${group.name}" a été acceptée. Tu peux maintenant accéder aux channels.`,
          linkUrl: `/g/${slug}`,
          metadata: { groupId: group.id },
        },
      }),
      db.auditLog.create({
        data: {
          actorId: session.user.id,
          action: "JOIN_REQUEST_APPROVED",
          targetType: "GROUP",
          targetId: group.id,
          metadata: { requestId: request.id, userId: request.userId },
        },
      }),
    ]);
  } else {
    // Refus
    await db.$transaction([
      db.groupJoinRequest.update({
        where: { id: request.id },
        data: {
          status: "REJECTED",
          reviewedBy: session.user.id,
          reviewedAt: now,
        },
      }),
      db.systemNotification.create({
        data: {
          userId: request.userId,
          type: "JOIN_REQUEST_REJECTED",
          title: "Demande refusée",
          content: parsed.data.note
            ? `Ta demande pour rejoindre "${group.name}" a été refusée. Raison : "${parsed.data.note}"`
            : `Ta demande pour rejoindre "${group.name}" a été refusée.`,
          metadata: { groupId: group.id },
        },
      }),
      db.auditLog.create({
        data: {
          actorId: session.user.id,
          action: "JOIN_REQUEST_REJECTED",
          targetType: "GROUP",
          targetId: group.id,
          metadata: { requestId: request.id, userId: request.userId },
        },
      }),
    ]);
  }

  return NextResponse.json({ success: true });
}
