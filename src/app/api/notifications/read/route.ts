// POST /api/notifications/read
// Marque une ou plusieurs notifications comme lues
// Body : { ids: string[] } ou { all: true }

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

const bodySchema = z.union([
  z.object({ ids: z.array(z.string()).min(1).max(100) }),
  z.object({ all: z.literal(true) }),
]);

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Body invalide" }, { status: 400 });
  }

  const now = new Date();

  if ("all" in parsed.data) {
    await db.systemNotification.updateMany({
      where: { userId: session.user.id, readAt: null },
      data: { readAt: now },
    });
  } else {
    await db.systemNotification.updateMany({
      where: {
        userId: session.user.id,
        id: { in: parsed.data.ids },
        readAt: null,
      },
      data: { readAt: now },
    });
  }

  return NextResponse.json({ success: true });
}
