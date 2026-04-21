// GET /api/users/[username]/stats
// Retourne level + xp + coins pour rafraîchir le header

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ username: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }

  const { username } = await params;

  // On ne renvoie les stats que pour soi-même (pas d'espionnage)
  if (username !== session.user.username) {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { level: true, xp: true, coins: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  return NextResponse.json({
    level: user.level,
    xp: user.xp.toString(),
    coins: user.coins,
  });
}
