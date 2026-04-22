// Helper pour créer une notification système ET envoyer un email
// si les préférences de l'user le permettent.
//
// Usage : await notifyUser({ userId, type, title, content, ... })

import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import type { Prisma } from "@prisma/client";

type NotifType =
  | "GROUP_DELETED"
  | "GROUP_BANNED"
  | "GROUP_KICKED"
  | "GROUP_BANNED_FROM"
  | "GROUP_PROMOTED"
  | "JOIN_REQUEST_RECEIVED"
  | "JOIN_REQUEST_APPROVED"
  | "JOIN_REQUEST_REJECTED"
  | "OWNERSHIP_TRANSFER_OFFER"
  | "OWNERSHIP_TRANSFER_ACCEPTED"
  | "NAME_CHANGE_APPROVED"
  | "NAME_CHANGE_REJECTED"
  | "MESSAGE_DELETED_BY_MOD"
  | "MESSAGE_MENTION"
  | "MESSAGE_REPLY"
  | "FRIEND_REQUEST"
  | "FRIEND_REQUEST_ACCEPTED"
  | "GIFT_RECEIVED"
  | "LEVEL_UP"
  | "PREMIUM_EXPIRING"
  | "ADMIN_MESSAGE"
  | "REPORT_HANDLED";

// Mapping type → clé de préférence email. Null = pas d'option email pour ce type.
const emailPrefKey: Partial<Record<NotifType, keyof import("@prisma/client").UserNotificationPreferences>> = {
  MESSAGE_MENTION: "emailOnMention",
  MESSAGE_REPLY: "emailOnReply",
  GIFT_RECEIVED: "emailOnGiftReceived",
  JOIN_REQUEST_APPROVED: "emailOnJoinRequestApproved",
  JOIN_REQUEST_RECEIVED: "emailOnJoinRequestReceived",
  MESSAGE_DELETED_BY_MOD: "emailOnMessageDeleted",
  REPORT_HANDLED: "emailOnReportHandled",
  LEVEL_UP: "emailOnLevelUp",
};

interface NotifyOptions {
  userId: string;
  type: NotifType;
  title: string;
  content: string;
  linkUrl?: string;
  metadata?: any;
  tx?: Prisma.TransactionClient;
}

export async function notifyUser({
  userId,
  type,
  title,
  content,
  linkUrl,
  metadata,
  tx,
}: NotifyOptions): Promise<void> {
  const client = tx ?? db;

  // Créer notification système (pour la cloche)
  await client.systemNotification.create({
    data: { userId, type, title, content, linkUrl, metadata },
  });

  // Vérifier si on doit envoyer un email (opt-in)
  const prefKey = emailPrefKey[type];
  if (!prefKey) return; // Pas d'option email pour ce type

  const prefs = await client.userNotificationPreferences.findUnique({
    where: { userId },
  });

  if (!prefs || !prefs[prefKey]) return; // Pas opt-in

  // Récupérer l'email
  const user = await client.user.findUnique({
    where: { id: userId },
    select: { email: true, username: true, emailVerified: true },
  });

  if (!user || !user.emailVerified) return;

  // Envoi async — on ne bloque pas la transaction
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const fullLink = linkUrl ? `${baseUrl}${linkUrl}` : baseUrl;

  sendEmail({
    to: user.email,
    subject: `[AnonRP] ${title}`,
    html: renderNotifEmail(user.username, title, content, fullLink),
    text: `${title}\n\n${content}\n\nVoir sur AnonRP : ${fullLink}\n\n—\nPour désactiver ces notifications, va dans tes paramètres.`,
  }).catch((e) => {
    console.error("[notify] Échec envoi email:", e);
  });
}

function renderNotifEmail(username: string, title: string, content: string, link: string): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, Segoe UI, sans-serif; background: #0f0f14; color: #e5e7eb; margin: 0; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: #1a1625; border-radius: 12px; padding: 32px; border: 1px solid #2d2740;">
    <h1 style="color: #a78bfa; margin: 0 0 16px; font-size: 20px;">${esc(title)}</h1>
    <p style="color: #d1d5db; line-height: 1.6;">${esc(content)}</p>
    <div style="text-align: center; margin: 28px 0;">
      <a href="${link}" style="display: inline-block; background: #7c3aed; color: white; padding: 10px 24px; text-decoration: none; border-radius: 8px;">
        Voir sur AnonRP
      </a>
    </div>
    <p style="color: #6b7280; font-size: 11px; margin-top: 24px; border-top: 1px solid #2d2740; padding-top: 12px;">
      Tu reçois cet email car tu as activé cette notification dans tes paramètres.<br>
      Pour te désabonner : va dans tes paramètres → notifications.
    </p>
  </div>
</body></html>`;
}
