"use client";

import { useEffect, useState } from "react";
import { GiftModal } from "./gift-modal";

interface GiftSummary {
  type: {
    slug: string;
    name: string;
    iconUrl: string;
    xpBoostPercent: number;
  };
  count: number;
  latest: string;
}

interface Props {
  receiverId: string;
  receiverUsername: string;
  receiverDisplayName: string | null;
  // null si on regarde son propre profil ou si pas connecté
  currentUserCoins: number | null;
  isOwnProfile: boolean;
}

export function ProfileGiftsSection({
  receiverId,
  receiverUsername,
  receiverDisplayName,
  currentUserCoins,
  isOwnProfile,
}: Props) {
  const [gifts, setGifts] = useState<GiftSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${receiverUsername}/gifts`);
      if (!res.ok) return;
      const data = await res.json();
      setGifts(data.types);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [receiverUsername]);

  const totalBoost = gifts.reduce(
    (sum, g) => sum + g.type.xpBoostPercent * g.count,
    0
  );
  const cappedBoost = Math.min(totalBoost, 0.2); // Cap à 20%

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          Cadeaux reçus {total > 0 && <span className="text-muted-foreground">({total})</span>}
        </h3>
        {!isOwnProfile && currentUserCoins !== null && (
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="px-3 py-1.5 rounded-md text-xs bg-primary text-primary-foreground hover:bg-primary/90"
          >
            🎁 Offrir un cadeau
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement...</p>
      ) : gifts.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">Aucun cadeau reçu pour l'instant.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {gifts.map((g) => (
            <div
              key={g.type.slug}
              title={`${g.count} × ${g.type.name}${
                g.type.xpBoostPercent > 0
                  ? ` · +${(g.type.xpBoostPercent * 100 * g.count).toFixed(1)}% XP total`
                  : ""
              }`}
              className="relative flex items-center gap-1 px-2 py-1.5 rounded-lg bg-muted/40 border border-border/50 hover:border-primary/50 transition-colors"
            >
              <span className="text-xl">{giftEmoji(g.type.slug)}</span>
              <span className="text-xs font-semibold">{g.count}</span>
            </div>
          ))}
          {cappedBoost > 0 && (
            <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-xs">
              ✨ +{(cappedBoost * 100).toFixed(1)}% XP actif
            </div>
          )}
        </div>
      )}

      {showModal && currentUserCoins !== null && (
        <GiftModal
          receiverId={receiverId}
          receiverUsername={receiverUsername}
          receiverDisplayName={receiverDisplayName}
          myCoins={currentUserCoins}
          onClose={() => setShowModal(false)}
          onSuccess={() => refresh()}
        />
      )}
    </div>
  );
}

function giftEmoji(slug: string): string {
  const map: Record<string, string> = {
    rose: "🌹",
    teddy: "🧸",
    star: "⭐",
    heart: "❤️",
    diamond: "💎",
    crown: "👑",
    dragon: "🐉",
  };
  return map[slug] ?? "🎁";
}
