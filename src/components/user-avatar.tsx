import Link from "next/link";
import { getPresenceStatus, presenceDotClass, type PresenceStatus } from "@/lib/presence";

interface UserMini {
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  level?: number;
  role?: string;
  premiumTier?: string | null;
  lastSeenAt?: Date | string | null;
}

interface Props {
  user: UserMini;
  size?: "xs" | "sm" | "md" | "lg";
  showStatus?: boolean;
  forceStatus?: PresenceStatus;
  className?: string;
  /**
   * Si true, l'avatar n'est PAS cliquable (pas de <Link>).
   * À utiliser quand UserAvatar est déjà à l'intérieur d'un autre <Link>
   * (sinon on crée un <a> imbriqué, ce qui est invalide en HTML).
   */
  noLink?: boolean;
}

export function UserAvatar({
  user,
  size = "md",
  showStatus = true,
  forceStatus,
  className = "",
  noLink = false,
}: Props) {
  const sizes = {
    xs: { box: "w-6 h-6", text: "text-[10px]", dot: "w-2 h-2 border" },
    sm: { box: "w-8 h-8", text: "text-xs", dot: "w-2.5 h-2.5 border-2" },
    md: { box: "w-10 h-10", text: "text-sm", dot: "w-3 h-3 border-2" },
    lg: { box: "w-16 h-16", text: "text-lg", dot: "w-4 h-4 border-2" },
  };
  const s = sizes[size];

  const initials = (user.displayName || user.username).substring(0, 2).toUpperCase();
  const status = forceStatus ?? getPresenceStatus(user.lastSeenAt ?? null);

  const inner = (
    <>
      <div className={`${s.box} rounded-full bg-primary/20 flex items-center justify-center font-bold ${s.text} overflow-hidden`}>
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
        ) : (
          <span>{initials}</span>
        )}
      </div>
      {showStatus && (
        <span
          className={`absolute bottom-0 right-0 rounded-full border-background ${s.dot} ${presenceDotClass(status)}`}
          title={status === "online" ? "En ligne" : status === "away" ? "Absent" : "Hors ligne"}
        />
      )}
    </>
  );

  if (noLink) {
    return <span className={`relative inline-block shrink-0 ${className}`}>{inner}</span>;
  }

  return (
    <Link href={`/u/${user.username}`} className={`relative inline-block shrink-0 ${className}`}>
      {inner}
    </Link>
  );
}

export function UserNameLink({
  user,
  showBadges = true,
  className = "",
  noLink = false,
}: {
  user: UserMini;
  showBadges?: boolean;
  className?: string;
  noLink?: boolean;
}) {
  const name = user.displayName || user.username;

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      {noLink ? (
        <span className="font-semibold">{name}</span>
      ) : (
        <Link href={`/u/${user.username}`} className="font-semibold hover:text-primary transition-colors">
          {name}
        </Link>
      )}
      {showBadges && user.role === "ADMIN" && (
        <span className="text-[10px] px-1 rounded bg-destructive/20 text-destructive">admin</span>
      )}
      {showBadges && user.premiumTier === "GOLD" && <span className="text-[10px]">⭐</span>}
      {showBadges && user.premiumTier === "SILVER" && <span className="text-[10px]">🥈</span>}
      {showBadges && user.premiumTier === "BRONZE" && <span className="text-[10px]">🥉</span>}
      {showBadges && typeof user.level === "number" && (
        <span className="text-xs text-muted-foreground">niv. {user.level}</span>
      )}
    </span>
  );
}
