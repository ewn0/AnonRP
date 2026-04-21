// Rate limiter en base de données (simple, suffisant pour commencer)
// Pour du gros trafic on passera sur Redis/Upstash plus tard

import { db } from "@/lib/db";

interface RateLimitOptions {
  identifier: string; // userId, IP, email
  action: string; // "login", "register", "message"...
  maxAttempts: number;
  windowSeconds: number;
}

/**
 * Vérifie si une action est autorisée selon les limites.
 * Retourne true si OK, false si bloqué.
 */
export async function checkRateLimit({
  identifier,
  action,
  maxAttempts,
  windowSeconds,
}: RateLimitOptions): Promise<{ allowed: boolean; retryAfter?: number }> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowSeconds * 1000);

  const existing = await db.rateLimit.findUnique({
    where: { identifier_action: { identifier, action } },
  });

  // Pas de record ou fenêtre expirée -> on reset
  if (!existing || existing.windowStart < windowStart) {
    await db.rateLimit.upsert({
      where: { identifier_action: { identifier, action } },
      create: { identifier, action, count: 1, windowStart: now },
      update: { count: 1, windowStart: now },
    });
    return { allowed: true };
  }

  // Dans la fenêtre : on incrémente
  if (existing.count >= maxAttempts) {
    const retryAfter = Math.ceil(
      (existing.windowStart.getTime() + windowSeconds * 1000 - now.getTime()) / 1000
    );
    return { allowed: false, retryAfter };
  }

  await db.rateLimit.update({
    where: { identifier_action: { identifier, action } },
    data: { count: { increment: 1 } },
  });

  return { allowed: true };
}

// Nettoyage périodique (à appeler via un cron)
export async function cleanupOldRateLimits() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24h
  await db.rateLimit.deleteMany({
    where: { windowStart: { lt: cutoff } },
  });
}
