// PATCH /api/users/me/invisible
// Active/désactive le mode invisible (ADMIN plateforme uniquement)

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

const bodySchema = z.object({
  isInvisible: z.boolean(),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Body invalide" }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  // Seul les admins plateforme peuvent activer
  if (user?.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Mode invisible réservé aux admins plateforme" },
      { status: 403 }
    );
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { isInvisible: parsed.data.isInvisible },
  });

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: parsed.data.isInvisible ? "INVISIBLE_ON" : "INVISIBLE_OFF",
      targetType: "USER",
      targetId: session.user.id,
    },
  });

  return NextResponse.json({ success: true, isInvisible: parsed.data.isInvisible });
}

// GET /api/users/me/invisible → état courant
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ isInvisible: false });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { isInvisible: true, role: true },
  });

  return NextResponse.json({
    isInvisible: user?.isInvisible ?? false,
    canToggle: user?.role === "ADMIN",
  });
}
