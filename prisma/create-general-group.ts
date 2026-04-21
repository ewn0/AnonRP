// Script pour créer le groupe officiel "Général" de la plateforme
// Lance avec : npx tsx prisma/create-general-group.ts
//
// Ce groupe :
// - est possédé par le compte admin (rôle plateforme ADMIN)
// - a le flag isSystemGroup = true
// - tous les utilisateurs sont auto-joinés lors de leur inscription (à implémenter)
//   → pour l'instant, tu peux inviter les users manuellement ou ils peuvent rejoindre via la liste

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  console.log("🌐 Création du groupe 'Général' système...\n");

  // Trouver un admin pour être owner
  const admin = await db.user.findFirst({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "asc" },
    select: { id: true, username: true },
  });

  if (!admin) {
    console.error("❌ Aucun admin trouvé. Lance d'abord `npm run db:seed`.");
    process.exit(1);
  }

  console.log(`Admin owner : @${admin.username}`);

  // Trouver la catégorie "Communautés" pour y ranger le groupe
  const category = await db.groupCategory.findUnique({
    where: { slug: "communautes" },
    select: { id: true },
  });

  // Vérifier s'il existe déjà
  const existing = await db.group.findUnique({
    where: { slug: "general" },
    select: { id: true, isSystemGroup: true },
  });

  if (existing) {
    if (!existing.isSystemGroup) {
      // Upgrade un groupe existant en système
      await db.group.update({
        where: { id: existing.id },
        data: {
          isSystemGroup: true,
          isFeatured: true,
          visibility: "PUBLIC",
        },
      });
      console.log("ℹ️  Groupe /general existait déjà, passé en système.");
    } else {
      console.log("ℹ️  Groupe système /general déjà existant, rien à faire.");
    }
    await db.$disconnect();
    return;
  }

  // Créer le groupe + channel général en transaction
  const group = await db.$transaction(async (tx) => {
    const g = await tx.group.create({
      data: {
        slug: "general",
        name: "Général",
        description:
          "Le groupe officiel d'AnonRP. Toute la communauté s'y retrouve pour discuter librement, poser des questions, faire connaissance, trouver des partenaires de RP. Tous les membres sont les bienvenus !",
        categoryId: category?.id,
        visibility: "PUBLIC",
        isNSFW: false,
        isFeatured: true,
        isSystemGroup: true,
        ownerId: admin.id,
        memberCount: 1,
        tags: ["officiel", "communaute", "anonrp"],
        maxTextChannels: 15,
      },
    });

    // Ajouter l'admin comme membre ADMIN du groupe
    await tx.groupMembership.create({
      data: {
        userId: admin.id,
        groupId: g.id,
        role: "ADMIN",
      },
    });

    // Créer quelques channels de base
    const channels = [
      { slug: "general", name: "Général", description: "Discussion générale", isSystem: true, position: 0 },
      { slug: "annonces", name: "Annonces", description: "Annonces de l'équipe AnonRP", isSystem: true, position: 1, writePermission: "MODS_ONLY" as const },
      { slug: "presentations", name: "Présentations", description: "Viens te présenter !", isSystem: false, position: 2 },
      { slug: "recherche-rp", name: "Recherche de RP", description: "Trouve des partenaires de RP", isSystem: false, position: 3 },
      { slug: "aide-suggestions", name: "Aide & Suggestions", description: "Questions, bugs, suggestions", isSystem: false, position: 4 },
    ];

    for (const ch of channels) {
      await tx.channel.create({
        data: {
          groupId: g.id,
          slug: ch.slug,
          name: ch.name,
          description: ch.description,
          type: "TEXT",
          isSystem: ch.isSystem,
          position: ch.position,
          writePermission: (ch as any).writePermission ?? "MEMBERS",
        },
      });
    }

    return g;
  });

  console.log(`\n✅ Groupe /general créé avec succès !`);
  console.log(`   ID : ${group.id}`);
  console.log(`   Channels : 5 créés (général, annonces, présentations, recherche-rp, aide-suggestions)`);
  console.log(`\n   Accessible sur : http://localhost:3000/g/general`);
  console.log(`\n💡 Astuce : les nouveaux inscrits devraient être auto-joinés à ce groupe`);
  console.log(`   (je peux t'ajouter ce comportement dans la route d'inscription si tu veux)\n`);

  await db.$disconnect();
}

main().catch((e) => {
  console.error("❌ Erreur :", e);
  process.exit(1);
});
