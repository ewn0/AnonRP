// Helpers pour la gestion du statut "en ligne"
//
// Logique : on considère qu'un user est "en ligne" si son lastSeenAt est < 5 min
// Ce lastSeenAt est mis à jour périodiquement par un endpoint /api/heartbeat
// que le front-end appelle toutes les minutes tant qu'il a un onglet ouvert.

const ONLINE_THRESHOLD_MINUTES = 5;

export type PresenceStatus = "online" | "away" | "offline";

/**
 * Calcule le statut d'un user selon son lastSeenAt.
 */
export function getPresenceStatus(lastSeenAt: Date | string | null): PresenceStatus {
  if (!lastSeenAt) return "offline";
  const seen = typeof lastSeenAt === "string" ? new Date(lastSeenAt) : lastSeenAt;
  const diffMin = (Date.now() - seen.getTime()) / 60000;
  if (diffMin < ONLINE_THRESHOLD_MINUTES) return "online";
  if (diffMin < 15) return "away";
  return "offline";
}

/**
 * Texte court "Vu il y a X" (pour profils, listes de membres).
 */
export function formatLastSeen(lastSeenAt: Date | string | null): string {
  if (!lastSeenAt) return "Jamais connecté";
  const seen = typeof lastSeenAt === "string" ? new Date(lastSeenAt) : lastSeenAt;
  const diffMs = Date.now() - seen.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  if (diffHour < 24) return `Il y a ${diffHour}h`;
  if (diffDay < 7) return `Il y a ${diffDay}j`;
  if (diffDay < 30) return `Il y a ${Math.floor(diffDay / 7)} sem`;
  if (diffDay < 365) return `Il y a ${Math.floor(diffDay / 30)} mois`;
  return `Il y a ${Math.floor(diffDay / 365)} an(s)`;
}

/**
 * Libellé du statut présence.
 */
export function presenceLabel(status: PresenceStatus): string {
  switch (status) {
    case "online": return "En ligne";
    case "away": return "Absent";
    case "offline": return "Hors ligne";
  }
}

/**
 * Classe CSS pour la pastille de présence.
 */
export function presenceDotClass(status: PresenceStatus): string {
  switch (status) {
    case "online": return "bg-green-500";
    case "away": return "bg-amber-500";
    case "offline": return "bg-gray-500";
  }
}
