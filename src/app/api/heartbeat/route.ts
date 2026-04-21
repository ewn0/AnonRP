// POST /api/heartbeat
// Ping de présence. Si user.isInvisible, on ne met PAS à jour lastSeenAt
// → aucune trace de passage récent n'apparaîtra nulle part

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { isInvisible: true, role: true },
  });

  // Si ADMIN invisible → on skip
  if (user?.isInvisible && user.role === "ADMIN") {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const now = new Date();
  await db.user.update({
    where: { id: session.user.id },
    data: { lastSeenAt: now },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, at: now });
}
