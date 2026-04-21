// Route : /api/admin/users
// GET  → lister tous les users (admin only)
// PATCH → modifier un user (vérifier email, ban, etc.)

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    return { ok: false as const, error: "Connexion requise", status: 401 };
  }

  // Re-vérifier en BDD (le JWT peut être stale)
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (user?.role !== "ADMIN") {
    return { ok: false as const, error: "Admin uniquement", status: 403 };
  }

  return { ok: true as const, session, userId: session.user.id };
}

// ========================================
// GET /api/admin/users
// ========================================
export async function GET(req: NextRequest) {
  const check = await requireAdmin();
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  const params = req.nextUrl.searchParams;
  const q = params.get("q")?.trim() ?? "";
  const filter = params.get("filter") ?? "all"; // all, unverified, banned
  const page = Math.max(1, parseInt(params.get("page") ?? "1", 10));
  const limit = 50;

  const where: any = {};

  if (q) {
    where.OR = [
      { email: { contains: q, mode: "insensitive" } },
      { username: { contains: q, mode: "insensitive" } },
    ];
  }

  if (filter === "unverified") {
    where.emailVerified = null;
  } else if (filter === "banned") {
    where.isBanned = true;
  }

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        emailVerified: true,
        isBanned: true,
        banReason: true,
        role: true,
        premiumTier: true,
        level: true,
        coins: true,
        createdAt: true,
        lastSeenAt: true,
      },
    }),
    db.user.count({ where }),
  ]);

  return NextResponse.json({
    users,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

// ========================================
// PATCH /api/admin/users
// Body: { userId, action, ... }
// ========================================
const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("verify_email"), userId: z.string() }),
  z.object({
    action: z.literal("ban"),
    userId: z.string(),
    reason: z.string().max(500),
  }),
  z.object({ action: z.literal("unban"), userId: z.string() }),
  z.object({
    action: z.literal("set_role"),
    userId: z.string(),
    role: z.enum(["MEMBER", "MODERATOR", "ADMIN"]),
  }),
  z.object({
    action: z.literal("adjust_coins"),
    userId: z.string(),
    amount: z.number().int(),
    reason: z.string().max(200),
  }),
]);

export async function PATCH(req: NextRequest) {
  const check = await requireAdmin();
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Action invalide" }, { status: 400 });
  }

  const adminId = check.userId;
  const target = await db.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true, username: true, role: true, coins: true },
  });

  if (!target) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  try {
    switch (parsed.data.action) {
      case "verify_email": {
        await db.$transaction([
          db.user.update({
            where: { id: target.id },
            data: { emailVerified: new Date() },
          }),
          db.auditLog.create({
            data: {
              actorId: adminId,
              action: "ADMIN_EMAIL_VERIFIED",
              targetType: "USER",
              targetId: target.id,
            },
          }),
        ]);
        return NextResponse.json({ success: true, message: "Email vérifié" });
      }

      case "ban": {
        if (target.role === "ADMIN" && target.id !== adminId) {
          return NextResponse.json(
            { error: "Un admin ne peut pas en bannir un autre" },
            { status: 403 }
          );
        }
        await db.$transaction([
          db.user.update({
            where: { id: target.id },
            data: {
              isBanned: true,
              banReason: parsed.data.reason,
              bannedAt: new Date(),
              bannedByUserId: adminId,
            },
          }),
          db.auditLog.create({
            data: {
              actorId: adminId,
              action: "USER_BANNED",
              targetType: "USER",
              targetId: target.id,
              metadata: { reason: parsed.data.reason },
            },
          }),
        ]);
        return NextResponse.json({ success: true, message: "Utilisateur banni" });
      }

      case "unban": {
        await db.$transaction([
          db.user.update({
            where: { id: target.id },
            data: {
              isBanned: false,
              banReason: null,
              bannedAt: null,
              bannedByUserId: null,
            },
          }),
          db.auditLog.create({
            data: {
              actorId: adminId,
              action: "USER_UNBANNED",
              targetType: "USER",
              targetId: target.id,
            },
          }),
        ]);
        return NextResponse.json({ success: true, message: "Utilisateur débanni" });
      }

      case "set_role": {
        if (target.role === "ADMIN" && parsed.data.role !== "ADMIN" && target.id !== adminId) {
          // OK pour rétrograder, mais pas soi-même
        }
        if (target.id === adminId && parsed.data.role !== "ADMIN") {
          return NextResponse.json(
            { error: "Tu ne peux pas rétrograder ton propre rôle admin" },
            { status: 403 }
          );
        }
        await db.$transaction([
          db.user.update({
            where: { id: target.id },
            data: { role: parsed.data.role },
          }),
          db.auditLog.create({
            data: {
              actorId: adminId,
              action: "USER_ROLE_CHANGED",
              targetType: "USER",
              targetId: target.id,
              metadata: { from: target.role, to: parsed.data.role },
            },
          }),
        ]);
        return NextResponse.json({ success: true, message: "Rôle modifié" });
      }

      case "adjust_coins": {
        const newBalance = target.coins + parsed.data.amount;
        if (newBalance < 0) {
          return NextResponse.json(
            { error: "Le solde ne peut pas être négatif" },
            { status: 400 }
          );
        }
        await db.$transaction([
          db.user.update({
            where: { id: target.id },
            data: { coins: newBalance },
          }),
          db.coinTransaction.create({
            data: {
              userId: target.id,
              amount: parsed.data.amount,
              balance: newBalance,
              type: "ADMIN_ADJUSTMENT",
              metadata: { adminId, reason: parsed.data.reason },
            },
          }),
          db.auditLog.create({
            data: {
              actorId: adminId,
              action: "ADMIN_COIN_ADJUSTMENT",
              targetType: "USER",
              targetId: target.id,
              metadata: { amount: parsed.data.amount, reason: parsed.data.reason },
            },
          }),
        ]);
        return NextResponse.json({ success: true, message: `${parsed.data.amount > 0 ? "+" : ""}${parsed.data.amount} coins` });
      }
    }
  } catch (error) {
    console.error("Admin action error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
