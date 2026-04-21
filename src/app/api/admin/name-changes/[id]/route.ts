// POST /api/admin/name-changes/[id]
// Action admin sur une demande de changement de nom

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { reviewNameChangeSchema } from "@/lib/validations/moderation";

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
    return NextResponse.json({ error: "Permissions insuffisantes" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = reviewNameChangeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Action invalide" }, { status: 400 });
  }

  const request = await db.groupNameChangeRequest.findUnique({
    where: { id },
    select: {
      id: true,
      groupId: true,
      requestedById: true,
      proposedName: true,
      proposedSlug: true,
      currentName: true,
      status: true,
    },
  });

  if (!request) {
    return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
  }

  if (request.status !== "PENDING") {
    return NextResponse.json({ error: "Déjà traitée" }, { status: 400 });
  }

  const now = new Date();

  if (parsed.data.action === "approve") {
    // Vérifier que le slug ne collisionne pas (si changement de slug)
    if (request.proposedSlug) {
      const existing = await db.group.findUnique({
        where: { slug: request.proposedSlug },
        select: { id: true },
      });
      if (existing && existing.id !== request.groupId) {
        return NextResponse.json(
          { error: "Ce slug est déjà pris, la demande ne peut pas être approuvée telle quelle" },
          { status: 400 }
        );
      }
    }

    await db.$transaction([
      db.group.update({
        where: { id: request.groupId },
        data: {
          name: request.proposedName,
          ...(request.proposedSlug ? { slug: request.proposedSlug } : {}),
        },
      }),
      db.groupNameChangeRequest.update({
        where: { id: request.id },
        data: {
          status: "APPROVED",
          reviewedById: session.user.id,
          reviewedAt: now,
          reviewNote: parsed.data.note,
        },
      }),
      db.systemNotification.create({
        data: {
          userId: request.requestedById,
          type: "NAME_CHANGE_APPROVED",
          title: "Changement de nom approuvé ✅",
          content: `Ton groupe s'appelle désormais "${request.proposedName}".${parsed.data.note ? ` Note de l'admin : "${parsed.data.note}"` : ""}`,
          metadata: { groupId: request.groupId, oldName: request.currentName, newName: request.proposedName },
        },
      }),
      db.auditLog.create({
        data: {
          actorId: session.user.id,
          action: "NAME_CHANGE_APPROVED",
          targetType: "GROUP",
          targetId: request.groupId,
          metadata: {
            requestId: request.id,
            from: request.currentName,
            to: request.proposedName,
          },
        },
      }),
    ]);
  } else {
    // Rejet
    await db.$transaction([
      db.groupNameChangeRequest.update({
        where: { id: request.id },
        data: {
          status: "REJECTED",
          reviewedById: session.user.id,
          reviewedAt: now,
          reviewNote: parsed.data.note,
        },
      }),
      db.systemNotification.create({
        data: {
          userId: request.requestedById,
          type: "NAME_CHANGE_REJECTED",
          title: "Changement de nom refusé",
          content: parsed.data.note
            ? `Ta demande de renommer en "${request.proposedName}" a été refusée. Raison : "${parsed.data.note}"`
            : `Ta demande de renommer en "${request.proposedName}" a été refusée.`,
          metadata: { groupId: request.groupId, proposedName: request.proposedName },
        },
      }),
      db.auditLog.create({
        data: {
          actorId: session.user.id,
          action: "NAME_CHANGE_REJECTED",
          targetType: "GROUP",
          targetId: request.groupId,
          metadata: { requestId: request.id, proposedName: request.proposedName },
        },
      }),
    ]);
  }

  return NextResponse.json({ success: true });
}
