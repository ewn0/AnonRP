// GET /api/groups/[slug]/requests
// Liste les demandes en attente pour un groupe (accessible à owner / modos / admins plateforme)

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  }

  const { slug } = await params;

  const group = await db.group.findUnique({
    where: { slug },
    select: {
      id: true,
      ownerId: true,
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

  const requests = await db.groupJoinRequest.findMany({
    where: { groupId: group.id, status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          level: true,
          createdAt: true,
        },
      },
    },
  });

  return NextResponse.json({ requests });
}
