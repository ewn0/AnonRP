// Script à lancer UNE FOIS après avoir appliqué le patch modération
// pour ajouter la config du seuil de changement de nom
//
// npx tsx prisma/add-mod-config.ts

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  console.log("🔧 Ajout des configs de modération...");

  await db.appConfig.upsert({
    where: { key: "group_name_change_threshold_active_members" },
    create: {
      key: "group_name_change_threshold_active_members",
      value: 50,
    },
    update: {}, // Ne pas écraser si déjà présent
  });

  console.log("✅ Config 'group_name_change_threshold_active_members' = 50");
  console.log("\n💡 Tu peux modifier ce seuil dans Prisma Studio → table AppConfig");

  await db.$disconnect();
}

main().catch((e) => {
  console.error("❌ Erreur :", e);
  process.exit(1);
});
