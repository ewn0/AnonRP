// Service de gestion de l'XP et des coins gagnés par message

import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { addCoins, getConfig } from "@/lib/coins";
import { xpRequiredForLevel, levelFromXp, coinsForLevelUp } from "@/lib/xp-utils";

// Ré-exports pour garder la compat avec le code existant qui importe depuis @/lib/xp
export { xpRequiredForLevel, levelFromXp, coinsForLevelUp };

interface MessageRewardResult {
  coinsEarned: number;
  xpGained: number;
  leveledUp: boolean;
  newLevel?: number;
  levelUpCoins?: number;
  skipped: boolean;
  skipReason?: string;
}

/**
 * Traite un message posté par un user :
 * - Vérifie cooldown + longueur minimum
 * - Attribue XP (boosté par cadeaux + premium)
 * - Attribue coins tous les N messages (avec cooldown coins)
 * - Détecte level up → bonus coins
 */
export async function processMessageReward(
  userId: string,
  content: string,
  tx?: Prisma.TransactionClient
): Promise<MessageRewardResult> {
  const client = tx ?? db;
  const now = new Date();

  const [
    messageCooldown,
    coinCooldown,
    messagesPerCoin,
    minMessageLength,
    baseXp,
    coinsPerLevel,
    coinsPer10Levels,
    coinsPer100Levels,
    maxBoost,
  ] = await Promise.all([
    getConfig<number>("message_cooldown_seconds", 10),
    getConfig<number>("coin_cooldown_seconds", 300),
    getConfig<number>("messages_per_coin", 10),
    getConfig<number>("min_message_length", 40),
    getConfig<number>("base_xp_per_message", 5),
    getConfig<number>("coins_per_level", 15),
    getConfig<number>("coins_per_10_levels", 50),
    getConfig<number>("coins_per_100_levels", 100),
    getConfig<number>("max_xp_boost_percent", 20),
  ]);

  const trimmed = content.trim();
  if (trimmed.length < minMessageLength) {
    return { coinsEarned: 0, xpGained: 0, leveledUp: false, skipped: true, skipReason: "too_short" };
  }

  const user = await client.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      xp: true,
      level: true,
      xpBoostPercent: true,
      premiumTier: true,
      premiumUntil: true,
      lastMessageAt: true,
      lastCoinEarnedAt: true,
      messagesToNextCoin: true,
    },
  });

  if (!user) {
    return { coinsEarned: 0, xpGained: 0, leveledUp: false, skipped: true, skipReason: "no_user" };
  }

  if (user.lastMessageAt) {
    const secondsSinceLast = (now.getTime() - user.lastMessageAt.getTime()) / 1000;
    if (secondsSinceLast < messageCooldown) {
      return { coinsEarned: 0, xpGained: 0, leveledUp: false, skipped: true, skipReason: "cooldown" };
    }
  }

  const isPremium = !!user.premiumTier && user.premiumUntil && user.premiumUntil > now;
  let premiumBoost = 0;
  if (isPremium) {
    if (user.premiumTier === "BRONZE") premiumBoost = 2;
    else if (user.premiumTier === "SILVER") premiumBoost = 5;
    else if (user.premiumTier === "GOLD") premiumBoost = 9;
  }
  const giftsBoost = Math.min(user.xpBoostPercent, maxBoost);
  const totalBoost = Math.min(premiumBoost + giftsBoost, maxBoost);
  const xpGained = Math.floor(baseXp * (1 + totalBoost / 100));

  const newXp = user.xp + BigInt(xpGained);
  const newLevel = levelFromXp(newXp);
  const leveledUp = newLevel > user.level;

  let coinsEarned = 0;
  let newMessagesToNextCoin = user.messagesToNextCoin - 1;
  let newLastCoinEarnedAt = user.lastCoinEarnedAt;

  if (newMessagesToNextCoin <= 0) {
    const secondsSinceLastCoin = user.lastCoinEarnedAt
      ? (now.getTime() - user.lastCoinEarnedAt.getTime()) / 1000
      : coinCooldown + 1;

    if (secondsSinceLastCoin >= coinCooldown) {
      coinsEarned = 1;
      newMessagesToNextCoin = messagesPerCoin;
      newLastCoinEarnedAt = now;
    } else {
      newMessagesToNextCoin = 0;
    }
  }

  let levelUpCoins = 0;
  if (leveledUp) {
    for (let lvl = user.level + 1; lvl <= newLevel; lvl++) {
      levelUpCoins += coinsForLevelUp(lvl, coinsPerLevel, coinsPer10Levels, coinsPer100Levels);
    }
  }

  const friendLimitPer5 = await getConfig<number>("friend_limit_per_5_levels", 1);
  const friendLimitPer50 = await getConfig<number>("friend_limit_per_50_levels", 5);
  const defaultFriendLimit = await getConfig<number>("default_friend_limit", 10);

  const computedFriendLimit = leveledUp
    ? defaultFriendLimit +
      Math.floor(newLevel / 5) * friendLimitPer5 +
      Math.floor(newLevel / 50) * friendLimitPer50
    : undefined;

  await client.user.update({
    where: { id: userId },
    data: {
      xp: newXp,
      level: newLevel,
      lastMessageAt: now,
      messagesToNextCoin: newMessagesToNextCoin,
      lastCoinEarnedAt: newLastCoinEarnedAt,
      ...(computedFriendLimit !== undefined ? { friendLimit: computedFriendLimit } : {}),
    },
  });

  if (coinsEarned > 0) {
    await addCoins({
      userId,
      amount: coinsEarned,
      type: "MESSAGE_REWARD",
      tx: client,
    });
  }

  if (levelUpCoins > 0) {
    await addCoins({
      userId,
      amount: levelUpCoins,
      type: "LEVEL_UP_REWARD",
      metadata: { fromLevel: user.level, toLevel: newLevel },
      tx: client,
    });

    await client.systemNotification.create({
      data: {
        userId,
        type: "LEVEL_UP",
        title: `Niveau ${newLevel} atteint ! 🎉`,
        content: `Bravo, tu es passé(e) au niveau ${newLevel}. Tu as gagné ${levelUpCoins} coins bonus.`,
        metadata: { level: newLevel, coins: levelUpCoins },
      },
    });
  }

  return {
    coinsEarned: coinsEarned + levelUpCoins,
    xpGained,
    leveledUp,
    newLevel: leveledUp ? newLevel : undefined,
    levelUpCoins: leveledUp ? levelUpCoins : undefined,
    skipped: false,
  };
}
