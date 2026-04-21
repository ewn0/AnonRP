// Service d'envoi d'emails via Resend.
// Si RESEND_API_KEY n'est pas configurée, fallback en mode console (dev).

import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const emailFrom = process.env.EMAIL_FROM || "AnonRP <onboarding@resend.dev>";

let resend: Resend | null = null;
if (resendApiKey) {
  resend = new Resend(resendApiKey);
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions): Promise<void> {
  // Fallback console si pas de clé (dev sans Resend)
  if (!resend) {
    console.log("\n📧 ===== EMAIL (mode dev, non envoyé) =====");
    console.log("À:", to);
    console.log("Sujet:", subject);
    console.log("Contenu:");
    console.log(text ?? "(HTML seulement, aucun texte fourni)");
    console.log("==========================================\n");
    return;
  }

  try {
    const res = await resend.emails.send({
      from: emailFrom,
      to: [to],
      subject,
      ...(html ? { html } : {}),
      ...(text ? { text } : {}),
    });

    if (res.error) {
      console.error("[Resend] Erreur d'envoi:", res.error);
      throw new Error(`Envoi email échoué: ${res.error.message}`);
    }

    console.log(`[Resend] Email envoyé à ${to} (id: ${res.data?.id})`);
  } catch (e) {
    console.error("[Resend] Exception:", e);
    throw e;
  }
}

// ============================================================
// Templates d'emails
// ============================================================

export function renderVerificationEmail(username: string, verifyUrl: string) {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, Segoe UI, sans-serif; background: #0f0f14; color: #e5e7eb; margin: 0; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: #1a1625; border-radius: 12px; padding: 32px; border: 1px solid #2d2740;">
    <h1 style="color: #a78bfa; margin: 0 0 16px; font-size: 24px;">Bienvenue sur AnonRP, ${escapeHtml(username)} !</h1>
    <p style="color: #d1d5db; line-height: 1.6;">
      Merci de t'être inscrit(e). Pour activer ton compte, clique sur le bouton ci-dessous.
    </p>
    <div style="text-align: center; margin: 28px 0;">
      <a href="${verifyUrl}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #a78bfa); color: white; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 500;">
        Vérifier mon email
      </a>
    </div>
    <p style="color: #9ca3af; font-size: 13px; line-height: 1.6;">
      Si le bouton ne fonctionne pas, copie-colle ce lien dans ton navigateur :<br>
      <span style="color: #a78bfa; word-break: break-all;">${verifyUrl}</span>
    </p>
    <p style="color: #6b7280; font-size: 12px; margin-top: 28px; padding-top: 16px; border-top: 1px solid #2d2740;">
      Ce lien expire dans 24 heures. Si tu n'es pas à l'origine de cette inscription, ignore cet email.
    </p>
  </div>
</body>
</html>`;

  const text = `Bienvenue sur AnonRP, ${username} !

Vérifie ton email en cliquant sur ce lien :
${verifyUrl}

Ce lien expire dans 24 heures.`;

  return { html, text };
}

export function renderPasswordResetEmail(username: string, resetUrl: string) {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, Segoe UI, sans-serif; background: #0f0f14; color: #e5e7eb; margin: 0; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: #1a1625; border-radius: 12px; padding: 32px; border: 1px solid #2d2740;">
    <h1 style="color: #a78bfa; margin: 0 0 16px; font-size: 24px;">Réinitialisation de mot de passe</h1>
    <p style="color: #d1d5db; line-height: 1.6;">
      Salut ${escapeHtml(username)}, tu as demandé à changer ton mot de passe sur AnonRP.
    </p>
    <div style="text-align: center; margin: 28px 0;">
      <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #a78bfa); color: white; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 500;">
        Choisir un nouveau mot de passe
      </a>
    </div>
    <p style="color: #6b7280; font-size: 12px; margin-top: 28px; padding-top: 16px; border-top: 1px solid #2d2740;">
      Ce lien expire dans 1 heure. Si tu n'as pas fait cette demande, ignore cet email — ton mot de passe reste inchangé.
    </p>
  </div>
</body>
</html>`;

  const text = `Salut ${username},

Tu as demandé à changer ton mot de passe. Clique sur ce lien :
${resetUrl}

Ce lien expire dans 1 heure. Si ce n'était pas toi, ignore cet email.`;

  return { html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
