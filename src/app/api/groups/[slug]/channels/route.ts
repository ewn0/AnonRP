// Routes /api/groups/[slug]/channels
// GET  → lister les channels du groupe
// POST → créer un channel (modo/admin seulement)

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { pusher, pusherChannels, pusherEvents } from "@/lib/pusher";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// ========================================
// GET : lister les channels
// ========================================
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
      memberships: {
        where: { userId: session.user.id },
        select: { role: true },
      },
    },
  });

  if (!group) {
    return NextResponse.json({ error: "Groupe introuvable" }, { status: 404 });
  }

  if (group.memberships.length === 0) {
    return NextResponse.json({ error: "Pas membre" }, { status: 403 });
  }

  const channels = await db.channel.findMany({
    where: { groupId: group.id, isDeleted: false },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      type: true,
      position: true,
      isSystem: true,
      isLocked: true,
      writePermission: true,
    },
  });

  return NextResponse.json({ channels });
}

// ========================================
// POST : créer un channel
// ========================================
const createChannelSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(200).optional(),
  type: z.enum(["TEXT", "ANNOUNCEMENT"]).default("TEXT"),
  writePermission: z.enum(["MEMBERS", "MODS_ONLY", "READ_ONLY"]).default("MEMBERS"),
});

// Génère un slug à partir d'un nom
function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  }

  const { slug } = await params;

  const body = await req.json().catch(() => null);
  const parsed = createChannelSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Vérifier droits (modo ou admin du groupe, ou admin plateforme)
  const group = await db.group.findUnique({
    where: { slug },
    select: {
      id: true,
      maxTextChannels: true,
      memberships: {
        where: { userId: session.user.id },
        select: { role: true },
      },
      _count: {
        select: { channels: { where: { isDeleted: false, type: "TEXT" } } },
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
    groupRole === "MODERATOR" ||
    groupRole === "ADMIN" ||
    platformUser?.role === "ADMIN";

  if (!canManage) {
    return NextResponse.json({ error: "Permissions insuffisantes" }, { status: 403 });
  }

  // Vérifier la limite de channels
  if (group._count.channels >= group.maxTextChannels) {
    return NextResponse.json(
      { error: `Limite de ${group.maxTextChannels} channels atteinte` },
      { status: 400 }
    );
  }

  // Générer slug unique
  const baseSlug = slugify(parsed.data.name) || "channel";
  let channelSlug = baseSlug;
  let suffix = 1;
  while (
    await db.channel.findUnique({
      where: { groupId_slug: { groupId: group.id, slug: channelSlug } },
      select: { id: true },
    })
  ) {
    channelSlug = `${baseSlug}-${suffix}`;
    suffix++;
    if (suffix > 100) {
      return NextResponse.json({ error: "Impossible de créer un slug unique" }, { status: 400 });
    }
  }

  // Trouver la position maximale pour mettre le nouveau à la fin
  const maxPosition = await db.channel.findFirst({
    where: { groupId: group.id },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const channel = await db.channel.create({
    data: {
      groupId: group.id,
      name: parsed.data.name,
      slug: channelSlug,
      description: parsed.data.description,
      type: parsed.data.type,
      writePermission: parsed.data.writePermission,
      position: (maxPosition?.position ?? -1) + 1,
    },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      type: true,
      position: true,
      isSystem: true,
      isLocked: true,
      writePermission: true,
    },
  });

  // Audit log
  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "CHANNEL_CREATED",
      targetType: "CHANNEL",
      targetId: channel.id,
      metadata: { groupId: group.id, name: parsed.data.name },
    },
  });

  // Notifier les clients via Pusher
  try {
    await pusher.trigger(
      pusherChannels.groupPresence(group.id),
      pusherEvents.CHANNEL_CREATED,
      channel
    );
  } catch (e) {
    console.error("Pusher trigger failed:", e);
  }

  return NextResponse.json({ success: true, channel });
}
