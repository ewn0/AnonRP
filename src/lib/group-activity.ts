// Compte les membres actifs d'un groupe sur les 24 dernières heures
// = nombre distinct d'utilisateurs ayant posté au moins un message dans un channel du groupe
// Utilise un cache en BDD (champ Group.activeMembersCount24h) avec TTL de 2 minutes

import { db } from "@/lib/db";

const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Retourne le nombre de membres ayant posté dans les 24 dernières heures.
 * Recalcule si le cache est expiré.
 */
export async function getActiveMembers24h(groupId: string): Promise<number> {
  const group = await db.group.findUnique({
    where: { id: groupId },
    select: {
      activeMembersCount24h: true,
      activeCountUpdatedAt: true,
    },
  });

  if (!group) return 0;

  // Cache valide ? On renvoie direct
  if (
    group.activeCountUpdatedAt &&
    Date.now() - group.activeCountUpdatedAt.getTime() < CACHE_TTL_MS
  ) {
    return group.activeMembersCount24h;
  }

  // Sinon recalcul
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const distinctAuthors = await db.channelMessage.findMany({
    where: {
      channel: { groupId },
      createdAt: { gte: since },
      isDeleted: false,
    },
    distinct: ["authorId"],
    select: { authorId: true },
  });

  const count = distinctAuthors.length;

  // Met à jour le cache
  await db.group.update({
    where: { id: groupId },
    data: {
      activeMembersCount24h: count,
      activeCountUpdatedAt: new Date(),
    },
  });

  return count;
}
