// GET /api/groups/[slug]/search-members?q=ara
// Retourne les membres du groupe dont le username/displayName commence par q
// Utilisé pour l'autocomplete des mentions @...

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ users: [] });
  }

  const { slug } = await params;
  const q = req.nextUrl.searchParams.get("q")?.trim().toLowerCase();

  if (!q || q.length < 1) {
    return NextResponse.json({ users: [] });
  }

  const group = await db.group.findUnique({
    where: { slug },
    select: {
      id: true,
      memberships: {
        where: { userId: session.user.id },
        select: { id: true },
      },
    },
  });

  if (!group || group.memberships.length === 0) {
    return NextResponse.json({ users: [] });
  }

  const members = await db.groupMembership.findMany({
    where: {
      groupId: group.id,
      user: {
        isBanned: false,
        OR: [
          { username: { startsWith: q, mode: "insensitive" } },
          { displayName: { startsWith: q, mode: "insensitive" } },
        ],
      },
    },
    take: 8,
    select: {
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
  });

  return NextResponse.json({
    users: members.map((m) => m.user),
  });
}
