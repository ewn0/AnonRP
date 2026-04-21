// Script de seed : initialise la base avec les données par défaut
// Lance-le avec : npm run db:seed

import { PrismaClient, PremiumTier } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

/**
 * Valide qu'un mot de passe respecte les règles côté front (Zod).
 * Sinon le compte créé ici ne pourrait jamais se connecter.
 */
function validateAdminPassword(pwd: string): string | null {
  if (pwd.length < 10) return "Doit faire au moins 10 caractères";
  if (!/[a-z]/.test(pwd)) return "Doit contenir au moins une minuscule";
  if (!/[A-Z]/.test(pwd)) return "Doit contenir au moins une majuscule";
  if (!/[0-9]/.test(pwd)) return "Doit contenir au moins un chiffre";
  return null;
}

async function main() {
  console.log("🌱 Démarrage du seed...\n");

  // ============================================================
  // 1. ADMIN INITIAL
  // ============================================================
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL || "admin@anonrp.local";
  const adminUsername = process.env.INITIAL_ADMIN_USERNAME || "admin";
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || "ChangeMe2025!";

  // 🛡️ Vérif pré-création : refuser un mot de passe qui ne permettrait pas de se connecter
  const pwdError = validateAdminPassword(adminPassword);
  if (pwdError) {
    console.error(`\n❌ ERREUR : mot de passe admin invalide (${pwdError}).`);
    console.error(`   Ton INITIAL_ADMIN_PASSWORD dans .env ne respecte pas les règles de sécurité.`);
    console.error(`   Si ce compte est créé, tu ne pourras JAMAIS te connecter dessus (le formulaire de login le rejettera).\n`);
    console.error(`   Règles : au moins 10 caractères, au moins 1 minuscule, 1 majuscule et 1 chiffre.`);
    console.error(`   Exemple valide : AnonRpAdmin2026\n`);
    console.error(`   Modifie ton .env puis relance "npm run db:seed".\n`);
    process.exit(1);
  }

  const existingAdmin = await db.user.findUnique({ where: { email: adminEmail } });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await db.user.create({
      data: {
        email: adminEmail,
        username: adminUsername,
        passwordHash,
        isAdult: true,
        role: "ADMIN",
        emailVerified: new Date(),
        displayName: "Admin",
        level: 100,
        coins: 100000,
      },
    });
    console.log(`✅ Admin créé : ${adminEmail} / ${adminUsername}`);
    console.log(`   ⚠️  Mot de passe : celui dans ton .env - change-le à la première connexion !\n`);
  } else {
    console.log(`ℹ️  Admin déjà existant : ${adminEmail}`);
    console.log(`   (Pour le régénérer : supprime la ligne dans Prisma Studio puis relance le seed)\n`);
  }

  // ============================================================
  // 2. CATÉGORIES DE GROUPES
  // ============================================================
  const categories = [
    { slug: "anime-manga", name: "Anime & Manga", emoji: "🎭", description: "One Piece, Naruto, AOT...", displayOrder: 1 },
    { slug: "jeux-video", name: "Jeux vidéo", emoji: "🎮", description: "MMORPG, FPS, indé, rétro...", displayOrder: 2 },
    { slug: "livres", name: "Livres & littérature", emoji: "📚", description: "Fantasy, SF, romans...", displayOrder: 3 },
    { slug: "films-series", name: "Films & séries", emoji: "🎬", description: "MCU, Star Wars, séries...", displayOrder: 4 },
    { slug: "rp-libre", name: "RP libre", emoji: "🎭", description: "Roleplay d'univers originaux", displayOrder: 5 },
    { slug: "fantasy", name: "Fantasy", emoji: "⚔️", description: "Elfes, dragons, magie...", displayOrder: 6 },
    { slug: "scifi", name: "Science-fiction", emoji: "🚀", description: "Cyberpunk, space opera...", displayOrder: 7 },
    { slug: "horreur", name: "Horreur & paranormal", emoji: "👻", description: "Zombies, vampires, occulte...", displayOrder: 8 },
    { slug: "vie-quotidienne", name: "Vie quotidienne", emoji: "🏠", description: "RP slice of life, romance...", displayOrder: 9 },
    { slug: "communautes", name: "Communautés", emoji: "🌍", description: "Parisiens, régions, pays...", displayOrder: 10 },
    { slug: "autre", name: "Autre", emoji: "💡", description: "Ce qui ne rentre nulle part ailleurs", displayOrder: 99 },
  ];

  for (const cat of categories) {
    await db.groupCategory.upsert({
      where: { slug: cat.slug },
      create: cat,
      update: cat,
    });
  }
  console.log(`✅ ${categories.length} catégories de groupes`);

  // ============================================================
  // 3. TYPES DE CADEAUX
  // ============================================================
  const gifts = [
    { slug: "rose", name: "Rose", description: "Une rose élégante", costCoins: 500, xpBoostPercent: 0.002, displayOrder: 1, iconUrl: "/gifts/rose.svg" },
    { slug: "teddy", name: "Nounours", description: "Un adorable nounours", costCoins: 1500, xpBoostPercent: 0.01, displayOrder: 2, iconUrl: "/gifts/teddy.svg" },
    { slug: "star", name: "Étoile", description: "Une étoile filante", costCoins: 2000, xpBoostPercent: 0.02, displayOrder: 3, iconUrl: "/gifts/star.svg" },
    { slug: "heart", name: "Cœur", description: "Un cœur rouge", costCoins: 3000, xpBoostPercent: 0.05, displayOrder: 4, iconUrl: "/gifts/heart.svg" },
    { slug: "diamond", name: "Diamant", description: "Un diamant brillant", costCoins: 5000, xpBoostPercent: 0.2, displayOrder: 5, iconUrl: "/gifts/diamond.svg" },
    { slug: "crown", name: "Couronne", description: "Pour les rois et reines", costCoins: 10000, xpBoostPercent: 0.5, displayOrder: 6, iconUrl: "/gifts/crown.svg" },
    { slug: "dragon", name: "Dragon", description: "Un dragon légendaire", costCoins: 25000, xpBoostPercent: 1.0, displayOrder: 7, iconUrl: "/gifts/dragon.svg" },
  ];

  for (const gift of gifts) {
    await db.giftType.upsert({
      where: { slug: gift.slug },
      create: gift,
      update: gift,
    });
  }
  console.log(`✅ ${gifts.length} types de cadeaux`);

  // ============================================================
  // 4. PACKS DE COINS
  // ============================================================
  const coinPacks = [
    { slug: "starter", name: "Pack Débutant", coinAmount: 100, bonusCoins: 0, priceCents: 87, displayOrder: 1 },
    { slug: "small", name: "Pack Petit", coinAmount: 200, bonusCoins: 0, priceCents: 167, displayOrder: 2 },
    { slug: "medium", name: "Pack Moyen", coinAmount: 500, bonusCoins: 50, priceCents: 399, displayOrder: 3 },
    { slug: "large", name: "Pack Large", coinAmount: 1200, bonusCoins: 200, priceCents: 899, displayOrder: 4 },
    { slug: "huge", name: "Pack Énorme", coinAmount: 3000, bonusCoins: 700, priceCents: 1999, displayOrder: 5 },
    { slug: "whale", name: "Pack Baleine", coinAmount: 8000, bonusCoins: 2500, priceCents: 4999, displayOrder: 6 },
  ];

  for (const pack of coinPacks) {
    await db.coinPack.upsert({
      where: { slug: pack.slug },
      create: pack,
      update: pack,
    });
  }
  console.log(`✅ ${coinPacks.length} packs de coins`);

  // ============================================================
  // 5. PLANS PREMIUM
  // ============================================================
  const plans: Array<{
    tier: PremiumTier;
    name: string;
    monthlyCoins: number;
    xpBoostPercent: number;
    priceCents: number;
  }> = [
    { tier: "BRONZE", name: "Bronze", monthlyCoins: 1000, xpBoostPercent: 2, priceCents: 500 },
    { tier: "SILVER", name: "Argent", monthlyCoins: 3000, xpBoostPercent: 5, priceCents: 800 },
    { tier: "GOLD",   name: "Or",     monthlyCoins: 6000, xpBoostPercent: 9, priceCents: 1200 },
  ];

  for (const plan of plans) {
    await db.premiumPlan.upsert({
      where: { tier: plan.tier },
      create: plan,
      update: plan,
    });
  }
  console.log(`✅ ${plans.length} plans premium`);

  // ============================================================
  // 6. CONFIGURATION GLOBALE
  // ============================================================
  const configs: Array<[string, any]> = [
    ["message_cooldown_seconds", 10],
    ["coin_cooldown_seconds", 300],
    ["messages_per_coin", 10],
    ["min_message_length", 40],

    ["group_creation_cost", 200],
    ["group_creation_cost_premium", 100],
    ["group_creation_min_level", 5],
    ["group_boost_cost", 5000],
    ["group_boost_cost_premium", 3000],
    ["group_boost_duration_days", 7],
    ["friend_limit_increase_cost", 200],
    ["friend_limit_increase_amount", 5],

    ["base_xp_per_message", 5],
    ["coins_per_level", 15],
    ["coins_per_10_levels", 50],
    ["coins_per_100_levels", 100],
    ["max_xp_boost_percent", 20],

    ["default_friend_limit", 10],
    ["friend_limit_per_5_levels", 1],
    ["friend_limit_per_50_levels", 5],

    // Nouveau Phase 2B : seuil à partir duquel la suppression d'un groupe nécessite validation admin
    ["group_deletion_requires_approval_threshold", 50],
  ];

  for (const [key, value] of configs) {
    await db.appConfig.upsert({
      where: { key },
      create: { key, value },
      update: {},
    });
  }
  console.log(`✅ ${configs.length} paramètres de configuration`);

  console.log("\n🎉 Seed terminé avec succès !\n");
}

main()
  .catch((e) => {
    console.error("❌ Erreur de seed :", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
