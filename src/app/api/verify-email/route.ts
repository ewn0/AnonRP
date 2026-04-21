// Route : GET /api/verify-email?token=xxx
// Déplacée hors de /api/auth/ pour ne pas entrer en conflit avec NextAuth
// qui intercepte toutes les routes /api/auth/*

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  console.log("[verify-email] Token reçu:", token?.slice(0, 10) + "...");

  if (!token) {
    return NextResponse.redirect(new URL("/verify-email?status=missing", req.url));
  }

  try {
    const verification = await db.verificationRequest.findUnique({
      where: { token },
      include: { user: true },
    });

    console.log("[verify-email] Verification trouvée:", !!verification);

    if (!verification) {
      return NextResponse.redirect(new URL("/verify-email?status=invalid", req.url));
    }

    if (!verification.user) {
      console.log("[verify-email] Pas d'user lié au token");
      return NextResponse.redirect(new URL("/verify-email?status=invalid", req.url));
    }

    if (verification.expires < new Date()) {
      console.log("[verify-email] Token expiré");
      return NextResponse.redirect(new URL("/verify-email?status=expired", req.url));
    }

    if (verification.type !== "EMAIL_VERIFICATION") {
      console.log("[verify-email] Mauvais type:", verification.type);
      return NextResponse.redirect(new URL("/verify-email?status=invalid", req.url));
    }

    // Si l'email est déjà vérifié, on nettoie le token et on renvoie success
    if (verification.user.emailVerified) {
      console.log("[verify-email] Déjà vérifié, nettoyage du token");
      await db.verificationRequest.delete({ where: { id: verification.id } });
      return NextResponse.redirect(new URL("/verify-email?status=success", req.url));
    }

    // Marquer l'email comme vérifié + supprimer le token
    await db.$transaction([
      db.user.update({
        where: { id: verification.user.id },
        data: { emailVerified: new Date() },
      }),
      db.verificationRequest.delete({ where: { id: verification.id } }),
    ]);

    console.log("[verify-email] ✅ Email vérifié pour user:", verification.user.id);

    return NextResponse.redirect(new URL("/verify-email?status=success", req.url));
  } catch (error) {
    console.error("[verify-email] ❌ Erreur:", error);
    return NextResponse.redirect(new URL("/verify-email?status=error", req.url));
  }
}
