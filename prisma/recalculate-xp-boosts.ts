// prisma/recalculate-xp-boosts.ts
// Recalcule le xpBoostPercent de tous les users en fonction de leurs cadeaux non annulés.
// À lancer UNE fois après avoir changé les boosts dans seed-gifts.ts pour appliquer les nouveaux taux aux users existants.
//
// Lancement : npx tsx prisma/recalculate-xp-boosts.ts

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const MAX_BOOST_PERCENT = 20;

async function main() {
  console.log("🔄 Recalcul des boosts XP pour tous les users...\n");

  // Récupérer tous les users qui ont un boost non-zero ou qui ont reçu des cadeaux
  const usersWithGifts = await db.user.findMany({
    where: {
      OR: [
        { xpBoostPercent: { gt: 0 } },
        { giftsReceived: { some: { cancelledAt: null } } },
      ],
    },
    select: {
      id: true,
      username: true,
      xpBoostPercent: true,
      giftsReceived: {
        where: { cancelledAt: null },
        select: {
          giftType: {
            select: { xpBoostPercent: true },
          },
        },
      },
    },
  });

  console.log(`${usersWithGifts.length} user(s) à traiter\n`);

  let changed = 0;
  for (const u of usersWithGifts) {
    // Additionner tous les boosts des cadeaux non annulés, avec plafond à 20%
    const totalBoost = u.giftsReceived.reduce(
      (sum, g) => sum + g.giftType.xpBoostPercent,
      0
    );
    // Note : xpBoostPercent stocké en décimal (0.20 = 20%) mais le plafond c'est 20 (absolu). On convertit.
    // En fait dans le code, xpBoostPercent est un Float représentant 0.20 = 20% (fraction). Mais le cap est dit "20".
    // On ajuste : on travaille en fraction, cap à 0.20.
    const cappedBoost = Math.min(totalBoost, 0.20);

    if (Math.abs(u.xpBoostPercent - cappedBoost) > 0.0001) {
      await db.user.update({
        where: { id: u.id },
        data: { xpBoostPercent: cappedBoost },
      });
      const oldPct = (u.xpBoostPercent * 100).toFixed(2);
      const newPct = (cappedBoost * 100).toFixed(2);
      console.log(`  ↻ @${u.username.padEnd(20)} ${oldPct}% → ${newPct}%  (${u.giftsReceived.length} cadeaux)`);
      changed++;
    }
  }

  console.log(`\n✅ Terminé : ${changed} user(s) mis à jour sur ${usersWithGifts.length}.\n`);
}

main()
  .catch((e) => {
    console.error("❌ Erreur :", e);
    process.exit(1);
  })
  .finally(async () => {
    db.$disconnect();
  });
