// Fonctions utilitaires XP/niveau SANS dépendances BDD
// Utilisables côté client ET serveur

/**
 * Calcule l'XP cumulé nécessaire pour atteindre un niveau donné.
 * Courbe : xp = floor(100 * (level-1)^1.5)
 * Exemples :
 *   niveau 1 → 0 XP (point de départ)
 *   niveau 2 → 100 XP
 *   niveau 3 → 283 XP
 *   niveau 5 → 800 XP
 *   niveau 10 → 3162 XP
 *   niveau 50 → 35355 XP
 */
export function xpRequiredForLevel(level: number): bigint {
  if (level <= 1) return BigInt(0);
  return BigInt(Math.floor(100 * Math.pow(level - 1, 1.5)));
}

/**
 * Détermine le niveau à partir d'un total d'XP.
 */
export function levelFromXp(xp: bigint): number {
  let level = 1;
  while (xpRequiredForLevel(level + 1) <= xp) {
    level++;
    if (level > 500) break;
  }
  return level;
}

/**
 * Coins gagnés à chaque niveau (avec paliers).
 */
export function coinsForLevelUp(
  newLevel: number,
  baseAmount: number,
  per10Bonus: number,
  per100Bonus: number
): number {
  let total = baseAmount;
  if (newLevel % 100 === 0) total += per100Bonus;
  if (newLevel % 10 === 0) total += per10Bonus;
  return total;
}
