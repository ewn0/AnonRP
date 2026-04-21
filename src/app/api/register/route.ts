// POST /api/register
// Inscription utilisateur + envoi email vérification + auto-join "Général"
// FIX : accepte isAdult/acceptedTerms comme boolean OU string "true"/"on"

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendEmail, renderVerificationEmail } from "@/lib/email";

// Accepte true, "true", "on", 1 → boolean true. Sinon refuse.
const flexibleTrue = z
  .union([z.boolean(), z.string(), z.number()])
  .transform((v) => v === true || v === "true" || v === "on" || v === 1 || v === "1")
  .refine((v) => v === true, { message: "Tu dois accepter cette condition" });

const registerSchema = z.object({
  email: z.string().email().max(200),
  username: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[a-zA-Z0-9_-]+$/, "Lettres, chiffres, tirets et underscores uniquement"),
  password: z
    .string()
    .min(10)
    .max(200)
    .refine((s) => /[a-z]/.test(s), "Au moins une minuscule")
    .refine((s) => /[A-Z]/.test(s), "Au moins une majuscule")
    .refine((s) => /[0-9]/.test(s), "Au moins un chiffre"),
  isAdult: flexibleTrue,
  acceptedTerms: flexibleTrue.optional().default(true), // optionnel si le formulaire ne l'envoie pas
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  const rl = await checkRateLimit({
    identifier: `register:${ip}`,
    action: "register",
    maxAttempts: 3,
    windowSeconds: 3600,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Trop de tentatives, réessaie dans 1h" },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    // On retourne le premier message d'erreur pour que l'user comprenne
    const firstIssue = parsed.error.issues[0];
    const fieldName = firstIssue?.path.join(".");
    return NextResponse.json(
      {
        error: firstIssue?.message || "Données invalides",
        field: fieldName,
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const { email, username, password } = parsed.data;

  const existingByUsername = await db.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
    select: { id: true },
  });
  if (existingByUsername) {
    return NextResponse.json({ error: "Nom d'utilisateur déjà pris" }, { status: 400 });
  }

  const existingByEmail = await db.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true },
  });
  if (existingByEmail) {
    return NextResponse.json({ error: "Email déjà utilisé" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const verificationToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const generalGroup = await db.group.findUnique({
    where: { slug: "general" },
    select: { id: true, isSystemGroup: true },
  });

  const user = await db.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: {
        email: email.toLowerCase(),
        username,
        passwordHash,
        isAdult: true,
      },
      select: { id: true, email: true, username: true },
    });

    await tx.verificationRequest.create({
      data: {
        userId: u.id,
        identifier: u.email,
        token: verificationToken,
        expires: expiresAt,
        type: "EMAIL_VERIFICATION",
      },
    });

    if (generalGroup?.isSystemGroup) {
      await tx.groupMembership.create({
        data: { userId: u.id, groupId: generalGroup.id, role: "MEMBER" },
      });
      await tx.group.update({
        where: { id: generalGroup.id },
        data: { memberCount: { increment: 1 } },
      });
    }

    await tx.auditLog.create({
      data: {
        actorId: u.id,
        action: "USER_REGISTERED",
        targetType: "USER",
        targetId: u.id,
        metadata: { email: u.email, autoJoinedGeneral: !!generalGroup },
        ipAddress: ip,
      },
    });

    return u;
  });

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const verifyUrl = `${baseUrl}/api/verify-email?token=${verificationToken}`;

  try {
    const { html, text } = renderVerificationEmail(user.username, verifyUrl);
    await sendEmail({
      to: user.email,
      subject: "Vérifie ton email - AnonRP",
      html,
      text,
    });
  } catch (e) {
    console.error("[Register] Échec envoi email vérification:", e);
  }

  return NextResponse.json({
    success: true,
    message: "Compte créé. Vérifie ton email pour activer ton compte.",
  });
}
