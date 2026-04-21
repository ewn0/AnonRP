// PATCH /api/groups/[slug]
// Permet au owner (ou admin plateforme) de modifier les infos du groupe.
// Le nom fait l'objet d'un traitement spécial :
//  - si le groupe a < seuil membres actifs 24h : appliqué immédiatement
//  - sinon : ouvre une demande qui doit être validée par un admin plateforme

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { editGroupFreeSchema, editGroupNameSchema } from "@/lib/validations/moderation";
import { getActiveMembers24h } from "@/lib/group-activity";
import { getConfig } from "@/lib/coins";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  }

  const { slug } = await params;
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Body invalide" }, { status: 400 });
  }

  // Récupérer le groupe + vérifier permissions
  const group = await db.group.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      ownerId: true,
      isSystemGroup: true,
      memberships: {
        where: { userId: session.user.id },
        select: { role: true },
      },
    },
  });

  if (!group) {
    return NextResponse.json({ error: "Groupe introuvable" }, { status: 404 });
  }

  // Permission : owner du groupe OU admin plateforme
  const platformUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  const isPlatformAdmin = platformUser?.role === "ADMIN";
  const isOwner = group.ownerId === session.user.id;

  if (!isOwner && !isPlatformAdmin) {
    return NextResponse.json({ error: "Seul le créateur peut modifier" }, { status: 403 });
  }

  // Champs "libres" : description, tags, etc.
  const freeFields = editGroupFreeSchema.safeParse(body);
  // Champs "protégés" : nom/slug
  const nameFields = editGroupNameSchema.safeParse(body.nameChange ?? null);

  const updateData: any = {};
  const auditMetadata: any = { groupId: group.id };

  // ========== Champs libres ==========
  if (freeFields.success) {
    const d = freeFields.data;
    if (d.description !== undefined) updateData.description = d.description;
    if (d.categoryId !== undefined) updateData.categoryId = d.categoryId;
    if (d.visibility !== undefined) updateData.visibility = d.visibility;
    if (d.isNSFW !== undefined) updateData.isNSFW = d.isNSFW;
    if (d.iconUrl !== undefined) updateData.iconUrl = d.iconUrl;
    if (d.bannerUrl !== undefined) updateData.bannerUrl = d.bannerUrl;
    if (d.tags !== undefined) {
      updateData.tags = Array.from(new Set(d.tags.map((t) => t.toLowerCase()))).slice(0, 5);
    }
  }

  // Applique les champs libres
  if (Object.keys(updateData).length > 0) {
    await db.group.update({
      where: { id: group.id },
      data: updateData,
    });
    await db.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "GROUP_EDITED",
        targetType: "GROUP",
        targetId: group.id,
        metadata: { ...auditMetadata, fields: Object.keys(updateData) },
      },
    });
  }

  // ========== Changement de nom ==========
  let nameChangeResult: any = null;

  if (nameFields.success && nameFields.data.name !== group.name) {
    // On ne peut pas renommer un groupe système
    if (group.isSystemGroup) {
      return NextResponse.json(
        { error: "Les groupes système ne peuvent pas être renommés" },
        { status: 403 }
      );
    }

    const threshold = await getConfig<number>("group_name_change_threshold_active_members", 50);

    // Admins plateforme : toujours autorisés, peu importe la taille
    if (isPlatformAdmin) {
      await db.group.update({
        where: { id: group.id },
        data: {
          name: nameFields.data.name,
          ...(nameFields.data.slug ? { slug: nameFields.data.slug } : {}),
        },
      });
      await db.auditLog.create({
        data: {
          actorId: session.user.id,
          action: "GROUP_RENAMED_BY_ADMIN",
          targetType: "GROUP",
          targetId: group.id,
          metadata: { from: group.name, to: nameFields.data.name },
        },
      });
      nameChangeResult = { applied: true, immediately: true };
    } else {
      // Owner normal : vérifier le seuil d'actifs
      const activeCount = await getActiveMembers24h(group.id);

      if (activeCount < threshold) {
        // Petit groupe : application directe
        await db.group.update({
          where: { id: group.id },
          data: {
            name: nameFields.data.name,
            ...(nameFields.data.slug ? { slug: nameFields.data.slug } : {}),
          },
        });
        await db.auditLog.create({
          data: {
            actorId: session.user.id,
            action: "GROUP_RENAMED",
            targetType: "GROUP",
            targetId: group.id,
            metadata: { from: group.name, to: nameFields.data.name, activeCount },
          },
        });
        nameChangeResult = { applied: true, immediately: true };
      } else {
        // Grand groupe : créer une demande en attente
        // Vérifier qu'il n'y en a pas déjà une en cours
        const existing = await db.groupNameChangeRequest.findFirst({
          where: { groupId: group.id, status: "PENDING" },
          select: { id: true },
        });

        if (existing) {
          return NextResponse.json(
            { error: "Une demande de changement de nom est déjà en attente pour ce groupe" },
            { status: 400 }
          );
        }

        const request = await db.groupNameChangeRequest.create({
          data: {
            groupId: group.id,
            requestedById: session.user.id,
            currentName: group.name,
            proposedName: nameFields.data.name,
            currentSlug: group.slug,
            proposedSlug: nameFields.data.slug,
            reason: nameFields.data.reason,
          },
        });

        await db.auditLog.create({
          data: {
            actorId: session.user.id,
            action: "GROUP_NAME_CHANGE_REQUESTED",
            targetType: "GROUP",
            targetId: group.id,
            metadata: { proposedName: nameFields.data.name, activeCount, threshold },
          },
        });

        nameChangeResult = { applied: false, requestId: request.id, activeCount, threshold };
      }
    }
  }

  return NextResponse.json({
    success: true,
    updated: Object.keys(updateData),
    nameChange: nameChangeResult,
  });
}
