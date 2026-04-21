// GET /api/groups/[slug]/members
// Retourne la liste des membres du groupe.
// - Les ADMIN avec isInvisible=true sont ENTIÈREMENT exclus
// - Les admins/mods plateforme peuvent consulter même s'ils ne sont pas membres

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  }

  const { slug } = await params;
  const limit = Math.min(200, Math.max(10, parseInt(req.nextUrl.searchParams.get("limit") ?? "100", 10)));

  const group = await db.group.findUnique({
    where: { slug },
    select: {
      id: true,
      ownerId: true,
      memberships: {
        where: { userId: session.user.id },
        select: { id: true },
      },
    },
  });

  if (!group) {
    return NextResponse.json({ error: "Groupe introuvable" }, { status: 404 });
  }

  // Autorisation : membre OU admin/modo plateforme
  const platformUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  const isPlatformStaff = platformUser?.role === "ADMIN" || platformUser?.role === "MODERATOR";
  const isMember = group.memberships.length > 0;

  if (!isMember && !isPlatformStaff) {
    return NextResponse.json({ error: "Pas membre" }, { status: 403 });
  }

  const members = await db.groupMembership.findMany({
    where: {
      groupId: group.id,
      user: {
        isBanned: false,
        // Exclure les ADMIN invisibles (sauf si c'est soi-même : on se voit toujours)
        NOT: {
          AND: [
            { isInvisible: true },
            { role: "ADMIN" },
            { id: { not: session.user.id } },
          ],
        },
      },
    },
    take: limit,
    orderBy: [{ role: "desc" }, { joinedAt: "asc" }],
    select: {
      role: true,
      nickname: true,
      joinedAt: true,
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          level: true,
          role: true,
          premiumTier: true,
          lastSeenAt: true,
          isInvisible: true,
        },
      },
    },
  });

  return NextResponse.json({
    ownerId: group.ownerId,
    members: members.map((m) => ({
      role: m.role,
      nickname: m.nickname,
      joinedAt: m.joinedAt,
      user: {
        ...m.user,
        // Si l'user est invisible (seulement soi-même ici vu le filter),
        // on remplace lastSeenAt par une valeur très ancienne
        lastSeenAt: m.user.isInvisible ? null : m.user.lastSeenAt,
      },
      isOwner: m.user.id === group.ownerId,
      _selfInvisible: m.user.isInvisible && m.user.id === session.user.id,
    })),
  });
}
