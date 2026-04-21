// Route : /api/groups
// GET  → lister les groupes
// POST → créer un groupe (avec channel "Général" auto-créé)

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { createGroupSchema, RESERVED_GROUP_SLUGS } from "@/lib/validations/group";
import { spendCoins, getConfig } from "@/lib/coins";
import { checkRateLimit } from "@/lib/rate-limit";

// ========================================
// GET /api/groups
// ========================================
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const q = params.get("q")?.trim() ?? "";
  const categoryId = params.get("category");
  const sort = params.get("sort") ?? "popular";
  const page = Math.max(1, parseInt(params.get("page") ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(params.get("limit") ?? "20", 10)));

  const where: any = {
    visibility: { in: ["PUBLIC", "PRIVATE"] },
  };

  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { tags: { has: q.toLowerCase() } },
    ];
  }

  if (categoryId) {
    where.categoryId = categoryId;
  }

  const orderBy =
    sort === "new"
      ? { createdAt: "desc" as const }
      : sort === "active"
      ? { activityScore: "desc" as const }
      : [{ isFeatured: "desc" as const }, { activityScore: "desc" as const }, { memberCount: "desc" as const }];

  const [groups, total] = await Promise.all([
    db.group.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        iconUrl: true,
        bannerUrl: true,
        memberCount: true,
        tags: true,
        isFeatured: true,
        isNSFW: true,
        visibility: true,
        isSystemGroup: true,
        createdAt: true,
        category: { select: { slug: true, name: true, emoji: true } },
      },
    }),
    db.group.count({ where }),
  ]);

  return NextResponse.json({
    groups,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

// ========================================
// POST /api/groups
// ========================================
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  }

  const rateLimit = await checkRateLimit({
    identifier: session.user.id,
    action: "create_group",
    maxAttempts: 3,
    windowSeconds: 3600,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Trop de créations, réessaie dans 1h" },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Body invalide" }, { status: 400 });
  }

  const parsed = createGroupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, slug, description, categoryId, visibility, isNSFW, tags } = parsed.data;

  const slugLower = slug.toLowerCase();
  if (RESERVED_GROUP_SLUGS.has(slugLower)) {
    return NextResponse.json({ error: "Ce slug est réservé" }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      coins: true,
      level: true,
      premiumTier: true,
      premiumUntil: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  const minLevel = await getConfig<number>("group_creation_min_level", 5);
  if (user.level < minLevel) {
    return NextResponse.json(
      { error: `Niveau ${minLevel} requis pour créer un groupe (tu es niveau ${user.level})` },
      { status: 403 }
    );
  }

  const isPremium =
    !!user.premiumTier && user.premiumUntil && user.premiumUntil > new Date();

  const cost = isPremium
    ? await getConfig<number>("group_creation_cost_premium", 100)
    : await getConfig<number>("group_creation_cost", 200);

  if (user.coins < cost) {
    return NextResponse.json(
      { error: `${cost} coins requis (tu en as ${user.coins})` },
      { status: 402 }
    );
  }

  const [existingSlug, categoryExists] = await Promise.all([
    db.group.findUnique({ where: { slug: slugLower }, select: { id: true } }),
    db.groupCategory.findUnique({ where: { id: categoryId }, select: { id: true } }),
  ]);

  if (existingSlug) {
    return NextResponse.json({ error: "Ce slug est déjà pris" }, { status: 400 });
  }
  if (!categoryExists) {
    return NextResponse.json({ error: "Catégorie invalide" }, { status: 400 });
  }

  const cleanTags = Array.from(new Set(tags.map((t) => t.toLowerCase()))).slice(0, 5);

  try {
    const group = await db.$transaction(async (tx) => {
      await spendCoins({
        userId: user.id,
        amount: cost,
        type: "GROUP_CREATION",
        metadata: { slug: slugLower },
        tx,
      });

      const newGroup = await tx.group.create({
        data: {
          slug: slugLower,
          name,
          description,
          categoryId,
          visibility,
          isNSFW,
          tags: cleanTags,
          ownerId: user.id,
          memberCount: 1,
        },
      });

      await tx.groupMembership.create({
        data: {
          userId: user.id,
          groupId: newGroup.id,
          role: "ADMIN",
        },
      });

      // Channel "Général" automatique
      await tx.channel.create({
        data: {
          groupId: newGroup.id,
          name: "Général",
          slug: "general",
          description: "Channel principal du groupe",
          type: "TEXT",
          position: 0,
          isSystem: true, // Non supprimable
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "GROUP_CREATED",
          targetType: "GROUP",
          targetId: newGroup.id,
          metadata: { slug: slugLower, cost, visibility },
        },
      });

      return newGroup;
    });

    return NextResponse.json({
      success: true,
      group: { id: group.id, slug: group.slug, name: group.name },
    });
  } catch (error) {
    console.error("Create group error:", error);
    if (error instanceof Error && error.message === "INSUFFICIENT_COINS") {
      return NextResponse.json({ error: "Solde insuffisant" }, { status: 402 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
