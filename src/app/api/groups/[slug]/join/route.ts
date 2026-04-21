// POST /api/groups/[slug]/join  → rejoindre un groupe (ou créer une demande)
// DELETE /api/groups/[slug]/join → quitter un groupe

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { joinRequestSchema } from "@/lib/validations/group";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// ========================================
// POST → rejoindre / demander à rejoindre
// ========================================
export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  }

  const { slug } = await params;

  // Récupérer le groupe
  const group = await db.group.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      visibility: true,
    },
  });

  if (!group) {
    return NextResponse.json({ error: "Groupe introuvable" }, { status: 404 });
  }

  // Vérifier si l'user est banni du groupe
  const isBanned = await db.groupBan.findUnique({
    where: { groupId_userId: { groupId: group.id, userId: session.user.id } },
    select: { id: true },
  });

  if (isBanned) {
    return NextResponse.json({ error: "Tu es banni de ce groupe" }, { status: 403 });
  }

  // Vérifier si déjà membre
  const existingMembership = await db.groupMembership.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId: group.id } },
    select: { id: true },
  });

  if (existingMembership) {
    return NextResponse.json({ error: "Déjà membre" }, { status: 400 });
  }

  // Groupe public : on rejoint direct
  if (group.visibility === "PUBLIC") {
    await db.$transaction([
      db.groupMembership.create({
        data: {
          userId: session.user.id,
          groupId: group.id,
          role: "MEMBER",
        },
      }),
      db.group.update({
        where: { id: group.id },
        data: { memberCount: { increment: 1 } },
      }),
    ]);

    return NextResponse.json({ success: true, status: "JOINED" });
  }

  // Groupe privé : on crée une demande (ou on retourne l'état de celle existante)
  const body = await req.json().catch(() => ({}));
  const parsed = joinRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Message invalide", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existingRequest = await db.groupJoinRequest.findUnique({
    where: { groupId_userId: { groupId: group.id, userId: session.user.id } },
    select: { id: true, status: true },
  });

  if (existingRequest) {
    if (existingRequest.status === "PENDING") {
      return NextResponse.json(
        { error: "Demande déjà en attente" },
        { status: 400 }
      );
    }
    if (existingRequest.status === "REJECTED") {
      return NextResponse.json(
        { error: "Ta demande précédente a été refusée. Tu ne peux pas reposer de demande." },
        { status: 403 }
      );
    }
    // Si CANCELLED ou APPROVED, on peut reposer une nouvelle demande (delete + create)
    await db.groupJoinRequest.delete({ where: { id: existingRequest.id } });
  }

  await db.groupJoinRequest.create({
    data: {
      groupId: group.id,
      userId: session.user.id,
      message: parsed.data.message,
      status: "PENDING",
    },
  });

  return NextResponse.json({ success: true, status: "REQUEST_PENDING" });
}

// ========================================
// DELETE → quitter un groupe
// ========================================
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  }

  const { slug } = await params;

  const group = await db.group.findUnique({
    where: { slug },
    select: { id: true, ownerId: true },
  });

  if (!group) {
    return NextResponse.json({ error: "Groupe introuvable" }, { status: 404 });
  }

  // Le créateur ne peut pas quitter son propre groupe (il doit le supprimer)
  if (group.ownerId === session.user.id) {
    return NextResponse.json(
      { error: "Le créateur ne peut pas quitter son groupe. Tu peux le supprimer à la place." },
      { status: 400 }
    );
  }

  const membership = await db.groupMembership.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId: group.id } },
    select: { id: true },
  });

  if (!membership) {
    return NextResponse.json({ error: "Pas membre de ce groupe" }, { status: 400 });
  }

  await db.$transaction([
    db.groupMembership.delete({ where: { id: membership.id } }),
    db.group.update({
      where: { id: group.id },
      data: { memberCount: { decrement: 1 } },
    }),
  ]);

  return NextResponse.json({ success: true });
}
