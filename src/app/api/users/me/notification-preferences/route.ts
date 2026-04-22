// GET /api/users/me/notification-preferences → état courant
// PATCH /api/users/me/notification-preferences → mise à jour

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

const DEFAULT_PREFS = {
  emailOnMention: false,
  emailOnReply: false,
  emailOnGiftReceived: false,
  emailOnJoinRequestApproved: false,
  emailOnJoinRequestReceived: false,
  emailOnMessageDeleted: false,
  emailOnReportHandled: false,
  emailOnLevelUp: false,
};

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  }

  const prefs = await db.userNotificationPreferences.findUnique({
    where: { userId: session.user.id },
  });

  return NextResponse.json(prefs ?? { userId: session.user.id, ...DEFAULT_PREFS });
}

const patchSchema = z.object({
  emailOnMention: z.boolean().optional(),
  emailOnReply: z.boolean().optional(),
  emailOnGiftReceived: z.boolean().optional(),
  emailOnJoinRequestApproved: z.boolean().optional(),
  emailOnJoinRequestReceived: z.boolean().optional(),
  emailOnMessageDeleted: z.boolean().optional(),
  emailOnReportHandled: z.boolean().optional(),
  emailOnLevelUp: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Body invalide" }, { status: 400 });
  }

  const updated = await db.userNotificationPreferences.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, ...DEFAULT_PREFS, ...parsed.data },
    update: parsed.data,
  });

  return NextResponse.json({ success: true, preferences: updated });
}
