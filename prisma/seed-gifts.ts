// prisma/seed-gifts.ts
// Crée ou met à jour les 7 types de cadeaux AnonRP.
// Boosts volontairement TRÈS légers : il faut des centaines de cadeaux pour atteindre le plafond +20%.
// Lancement : npx tsx prisma/seed-gifts.ts

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

interface GiftSeed {
  slug: string;
  name: string;
  description: string;
  iconUrl: string;
  costCoins: number;
  xpBoostPercent: number; // 0.0001 = +0.01%
  displayOrder: number;
}

const GIFTS: GiftSeed[] = [
  {
    slug: "rose",
    name: "Rose",
    description: "Un petit geste délicat pour faire plaisir.",
    iconUrl: "🌹",
    costCoins: 500,
    xpBoostPercent: 0.0001, // +0.01% — il faut 2000 roses pour +20%
    displayOrder: 1,
  },
  {
    slug: "teddy",
    name: "Teddy",
    description: "Un câlin virtuel à offrir.",
    iconUrl: "🧸",
    costCoins: 1500,
    xpBoostPercent: 0.0003, // +0.03%
    displayOrder: 2,
  },
  {
    slug: "star",
    name: "Étoile",
    description: "Parce que tu brilles dans la communauté.",
    iconUrl: "⭐",
    costCoins: 2000,
    xpBoostPercent: 0.0005, // +0.05%
    displayOrder: 3,
  },
  {
    slug: "heart",
    name: "Cœur",
    description: "L'amour, c'est la plus belle des monnaies.",
    iconUrl: "❤️",
    costCoins: 3000,
    xpBoostPercent: 0.0008, // +0.08%
    displayOrder: 4,
  },
  {
    slug: "diamond",
    name: "Diamant",
    description: "Rare et précieux, comme une vraie amitié.",
    iconUrl: "💎",
    costCoins: 5000,
    xpBoostPercent: 0.0015, // +0.15%
    displayOrder: 5,
  },
  {
    slug: "crown",
    name: "Couronne",
    description: "Pour couronner quelqu'un qui le mérite.",
    iconUrl: "👑",
    costCoins: 10000,
    xpBoostPercent: 0.003, // +0.3%
    displayOrder: 6,
  },
  {
    slug: "dragon",
    name: "Dragon",
    description: "Le cadeau ultime. Majestueux et légendaire.",
    iconUrl: "🐉",
    costCoins: 25000,
    xpBoostPercent: 0.005, // +0.5% — il faut 40 dragons pour +20%
    displayOrder: 7,
  },
];

async function main() {
  console.log("🎁 Seeding gift types (boosts équilibrés)...\n");

  let created = 0;
  let updated = 0;

  for (const g of GIFTS) {
    const existing = await db.giftType.findUnique({ where: { slug: g.slug } });

    await db.giftType.upsert({
      where: { slug: g.slug },
      create: { ...g, isActive: true },
      update: {
        name: g.name,
        description: g.description,
        iconUrl: g.iconUrl,
        costCoins: g.costCoins,
        xpBoostPercent: g.xpBoostPercent,
        displayOrder: g.displayOrder,
        isActive: true,
      },
    });

    if (existing) {
      updated++;
      const oldBoost = (existing.xpBoostPercent * 100).toFixed(2);
      const newBoost = (g.xpBoostPercent * 100).toFixed(2);
      console.log(`  ↻ ${g.iconUrl}  ${g.name.padEnd(10)} — ${g.costCoins.toString().padStart(6)} 💰  · boost ${oldBoost}% → ${newBoost}%`);
    } else {
      created++;
      console.log(`  ✨ ${g.iconUrl}  ${g.name.padEnd(10)} — ${g.costCoins.toString().padStart(6)} 💰  · boost +${(g.xpBoostPercent * 100).toFixed(2)}%  (créé)`);
    }
  }

  console.log(`\n✅ Terminé : ${created} créé(s), ${updated} mis à jour.`);
  console.log(`\n⚠️  Les utilisateurs qui ont déjà reçu des cadeaux gardent leur xpBoostPercent actuel.`);
  console.log(`   Pour recalculer tous les boosts actifs avec la nouvelle grille, lance :`);
  console.log(`   npx tsx prisma/recalculate-xp-boosts.ts\n`);
}

main()
  .catch((e) => {
    console.error("❌ Erreur :", e);
    process.exit(1);
  })
  .finally(async () => {
    db.$disconnect();
  });
