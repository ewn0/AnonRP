import { z } from "zod";

// Slug : lettres, chiffres, tirets uniquement (format URL-friendly)
const slugRegex = /^[a-z0-9-]{3,40}$/;

// Tags : lettres, chiffres, pas d'espaces
const tagRegex = /^[a-z0-9]{2,20}$/;

export const createGroupSchema = z.object({
  name: z
    .string()
    .min(3, "Le nom doit faire au moins 3 caractères")
    .max(50, "Le nom fait 50 caractères max"),

  slug: z
    .string()
    .regex(slugRegex, "3-40 caractères : lettres minuscules, chiffres, tirets uniquement"),

  description: z
    .string()
    .min(10, "Décris ton groupe en 10 caractères minimum")
    .max(1000, "Maximum 1000 caractères"),

  categoryId: z.string().min(1, "Choisis une catégorie"),

  visibility: z.enum(["PUBLIC", "PRIVATE"], {
    errorMap: () => ({ message: "Choisis public ou privé" }),
  }),

  isNSFW: z.boolean().default(false),

  tags: z
    .array(z.string().regex(tagRegex, "Tags : 2-20 caractères, lettres/chiffres sans espace"))
    .max(5, "5 tags maximum")
    .default([]),
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>;

export const joinRequestSchema = z.object({
  message: z
    .string()
    .max(300, "300 caractères max")
    .optional(),
});

// Slugs réservés (on veut pas que quelqu'un crée /groups/admin par exemple)
export const RESERVED_GROUP_SLUGS = new Set([
  "admin", "create", "new", "edit", "delete", "manage", "settings",
  "api", "login", "register", "auth", "public", "private",
  "popular", "featured", "trending", "all", "mine", "moderated",
]);
