// Service de gestion des AnonCoins
// IMPORTANT : toujours utiliser ces fonctions plutôt que de modifier user.coins directement,
// pour que chaque mouvement soit tracé dans CoinTransaction (audit, stats, debug)

import { db } from "@/lib/db";
import type { CoinTransactionType, Prisma } from "@prisma/client";

interface SpendCoinsOptions {
  userId: string;
  amount: number; // Montant positif à dépenser
  type: CoinTransactionType;
  metadata?: Prisma.InputJsonValue;
  tx?: Prisma.TransactionClient; // Pour utiliser dans une transaction existante
}

interface AddCoinsOptions {
  userId: string;
  amount: number; // Montant positif à ajouter
  type: CoinTransactionType;
  metadata?: Prisma.InputJsonValue;
  tx?: Prisma.TransactionClient;
}

/**
 * Déduit des coins de l'utilisateur. Lance une erreur si solde insuffisant.
 * Retourne le nouveau solde.
 */
export async function spendCoins({
  userId,
  amount,
  type,
  metadata,
  tx,
}: SpendCoinsOptions): Promise<number> {
  if (amount <= 0) throw new Error("Le montant doit être positif");

  const client = tx ?? db;

  // Si on n'est pas déjà dans une transaction, on en crée une pour l'atomicité
  if (!tx) {
    return await db.$transaction(async (trx) => {
      return await spendCoins({ userId, amount, type, metadata, tx: trx });
    });
  }

  // Récupérer le solde actuel
  const user = await client.user.findUnique({
    where: { id: userId },
    select: { coins: true },
  });

  if (!user) throw new Error("Utilisateur introuvable");
  if (user.coins < amount) throw new Error("INSUFFICIENT_COINS");

  const newBalance = user.coins - amount;

  await client.user.update({
    where: { id: userId },
    data: { coins: newBalance },
  });

  await client.coinTransaction.create({
    data: {
      userId,
      amount: -amount,
      balance: newBalance,
      type,
      metadata,
    },
  });

  return newBalance;
}

/**
 * Ajoute des coins à l'utilisateur.
 * Retourne le nouveau solde.
 */
export async function addCoins({
  userId,
  amount,
  type,
  metadata,
  tx,
}: AddCoinsOptions): Promise<number> {
  if (amount <= 0) throw new Error("Le montant doit être positif");

  const client = tx ?? db;

  if (!tx) {
    return await db.$transaction(async (trx) => {
      return await addCoins({ userId, amount, type, metadata, tx: trx });
    });
  }

  const user = await client.user.findUnique({
    where: { id: userId },
    select: { coins: true, totalCoinsEarned: true },
  });

  if (!user) throw new Error("Utilisateur introuvable");

  const newBalance = user.coins + amount;

  await client.user.update({
    where: { id: userId },
    data: {
      coins: newBalance,
      totalCoinsEarned: { increment: amount },
    },
  });

  await client.coinTransaction.create({
    data: {
      userId,
      amount,
      balance: newBalance,
      type,
      metadata,
    },
  });

  return newBalance;
}

/**
 * Récupère un paramètre de configuration (avec fallback par défaut).
 */
export async function getConfig<T>(key: string, defaultValue: T): Promise<T> {
  const config = await db.appConfig.findUnique({ where: { key } });
  return (config?.value as T) ?? defaultValue;
}
