import { z } from "zod";

// ============================================================
// Édition de groupe
// ============================================================

const slugRegex = /^[a-z0-9-]{3,40}$/;
const tagRegex = /^[a-z0-9]{2,20}$/;

// Édition "libre" (sans validation admin même si grand groupe)
export const editGroupFreeSchema = z.object({
  description: z.string().min(10).max(1000).optional(),
  categoryId: z.string().min(1).optional(),
  visibility: z.enum(["PUBLIC", "PRIVATE"]).optional(),
  isNSFW: z.boolean().optional(),
  tags: z
    .array(z.string().regex(tagRegex))
    .max(5)
    .optional(),
  iconUrl: z.string().url().max(500).nullable().optional(),
  bannerUrl: z.string().url().max(500).nullable().optional(),
});

export type EditGroupFreeInput = z.infer<typeof editGroupFreeSchema>;

// Changement de nom (peut nécessiter validation)
export const editGroupNameSchema = z.object({
  name: z.string().min(3).max(50),
  slug: z.string().regex(slugRegex).optional(), // Optionnel : si on change pas le slug
  reason: z.string().max(500).optional(),
});

export type EditGroupNameInput = z.infer<typeof editGroupNameSchema>;

// ============================================================
// Signalement
// ============================================================

export const reportMessageSchema = z.object({
  messageId: z.string().min(1),
  reason: z.enum([
    "SPAM",
    "HARASSMENT",
    "HATE_SPEECH",
    "SEXUAL_CONTENT",
    "MINOR_SAFETY",
    "VIOLENCE",
    "ILLEGAL_CONTENT",
    "IMPERSONATION",
    "OTHER",
  ]),
  description: z.string().max(1000).optional(),
});

export type ReportMessageInput = z.infer<typeof reportMessageSchema>;

// ============================================================
// Suppression message par modo
// ============================================================

export const deleteMessageSchema = z.object({
  reason: z.string().max(300).optional(),
});

export type DeleteMessageInput = z.infer<typeof deleteMessageSchema>;

// ============================================================
// Review d'une demande de changement de nom (admin plateforme)
// ============================================================

export const reviewNameChangeSchema = z.object({
  action: z.enum(["approve", "reject"]),
  note: z.string().max(500).optional(),
});
