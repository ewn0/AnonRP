// Validation des données avec Zod
// Zod = on définit les règles une fois, elles sont vérifiées automatiquement
// côté serveur (et peuvent aussi l'être côté client)

import { z } from "zod";

// Règles : lettres, chiffres, _ et - uniquement, 3-20 caractères
const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;

// Mot de passe fort : 10+ caractères, au moins 1 minuscule, 1 majuscule, 1 chiffre
const strongPassword = z
  .string()
  .min(10, "Le mot de passe doit faire au moins 10 caractères")
  .max(100, "Mot de passe trop long")
  .regex(/[a-z]/, "Doit contenir au moins une minuscule")
  .regex(/[A-Z]/, "Doit contenir au moins une majuscule")
  .regex(/[0-9]/, "Doit contenir au moins un chiffre");

export const registerSchema = z
  .object({
    email: z.string().email("Email invalide").toLowerCase(),
    username: z
      .string()
      .regex(
        usernameRegex,
        "3-20 caractères, lettres/chiffres/tirets/underscores uniquement"
      ),
    password: strongPassword,
    passwordConfirm: z.string(),
    isAdult: z.literal(true, {
      errorMap: () => ({ message: "Tu dois confirmer que tu es majeur(e)" }),
    }),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: "Tu dois accepter les CGU" }),
    }),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Les mots de passe ne correspondent pas",
    path: ["passwordConfirm"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email("Email invalide").toLowerCase(),
  password: z.string().min(1, "Mot de passe requis"),
});

export type LoginInput = z.infer<typeof loginSchema>;

// Noms d'utilisateur réservés (on ne laisse pas les gens prendre "admin", "modo"...)
export const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "moderator",
  "modo",
  "mod",
  "system",
  "anonrp",
  "anon",
  "bot",
  "support",
  "help",
  "root",
  "staff",
  "null",
  "undefined",
  "api",
  "www",
]);
