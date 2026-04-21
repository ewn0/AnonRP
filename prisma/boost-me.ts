// Script pour débloquer ton compte pour tes tests (Phase 2)
// Lance-le avec : npx tsx prisma/boost-me.ts
//
// Par défaut, donne 100 000 coins et niveau 100 à tous les comptes existants
// pour que tu puisses tester la création de groupes sans attendre.

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const users = await db.user.findMany({
    select: { id: true, username: true, coins: true, level: true },
  });

  console.log(`🚀 Boost de ${users.length} comptes...\n`);

  for (const user of users) {
    await db.user.update({
      where: { id: user.id },
      data: {
        coins: Math.max(user.coins, 100000),
        level: Math.max(user.level, 100),
        emailVerified: new Date(), // Au cas où
      },
    });
    console.log(`✅ @${user.username} → niveau 100, 100 000 coins`);
  }

  console.log(`\n🎉 Fait ! Tu peux maintenant créer plein de groupes pour tester.`);
}

main()
  .catch((e) => {
    console.error("❌", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
