"use client";

import { useState, useEffect } from "react";

interface GiftType {
  slug: string;
  name: string;
  description: string | null;
  iconUrl: string;
  costCoins: number;
  xpBoostPercent: number;
}

interface Props {
  receiverId: string;
  receiverUsername: string;
  receiverDisplayName: string | null;
  myCoins: number;
  // Si fourni : cadeau depuis un channel (message système public)
  channelId?: string;
  channelName?: string;
  onClose: () => void;
  onSuccess?: (newCoins: number) => void;
}

export function GiftModal({
  receiverId,
  receiverUsername,
  receiverDisplayName,
  myCoins,
  channelId,
  channelName,
  onClose,
  onSuccess,
}: Props) {
  const [types, setTypes] = useState<GiftType[]>([]);
  const [selected, setSelected] = useState<GiftType | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/gifts/types");
      if (!res.ok) return;
      const data = await res.json();
      if (!cancelled) setTypes(data.types);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit() {
    if (!selected || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/gifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId,
          giftTypeSlug: selected.slug,
          message: message || undefined,
          channelId,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "Erreur");
        return;
      }
      setSuccess(
        `🎉 Tu as offert ${selected.name} à ${receiverDisplayName || receiverUsername} !`
      );
      onSuccess?.(body.newSenderCoins);
      setTimeout(onClose, 2000);
    } catch {
      setError("Erreur réseau");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold">
              🎁 Offrir un cadeau à {receiverDisplayName || receiverUsername}
            </h2>
            {channelName && (
              <p className="text-xs text-muted-foreground mt-1">
                Depuis <span className="text-primary">#{channelName}</span> — le cadeau sera annoncé publiquement dans le channel
              </p>
            )}
          </div>
          <div className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
            💰 {myCoins.toLocaleString("fr-FR")}
          </div>
        </div>

        {success ? (
          <div className="p-4 rounded bg-green-600/20 text-green-400 text-center font-medium">
            {success}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
              {types.map((gt) => {
                const canAfford = myCoins >= gt.costCoins;
                const isSelected = selected?.slug === gt.slug;
                return (
                  <button
                    key={gt.slug}
                    type="button"
                    onClick={() => canAfford && setSelected(gt)}
                    disabled={!canAfford}
                    className={`p-3 rounded-lg border text-center transition-all ${
                      isSelected
                        ? "border-primary bg-primary/10 scale-105 shadow-lg"
                        : canAfford
                        ? "border-border hover:border-primary/50 hover:bg-accent/30"
                        : "border-border/30 opacity-40 cursor-not-allowed"
                    }`}
                  >
                    <div className="text-3xl mb-1">{giftEmojiFromSlug(gt.slug)}</div>
                    <div className="text-xs font-semibold">{gt.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">💰 {gt.costCoins.toLocaleString("fr-FR")}</div>
                    {gt.xpBoostPercent > 0 && (
                      <div className="text-[10px] text-primary mt-0.5">+{(gt.xpBoostPercent * 100).toFixed(1)}% XP</div>
                    )}
                  </button>
                );
              })}
            </div>

            {selected && (
              <div className="space-y-3">
                {selected.description && (
                  <p className="text-sm text-muted-foreground italic">
                    "{selected.description}"
                  </p>
                )}

                <div>
                  <label className="text-sm font-medium">
                    Message (optionnel{channelName ? ", visible dans le channel" : ""})
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={200}
                    rows={2}
                    className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Un petit mot pour accompagner..."
                  />
                  <p className="text-xs text-muted-foreground text-right mt-0.5">
                    {message.length}/200
                  </p>
                </div>
              </div>
            )}

            {error && <p className="text-sm text-destructive mt-3">{error}</p>}

            <div className="flex gap-2 justify-end mt-4 pt-4 border-t border-border/50">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm rounded-md border border-border hover:bg-accent"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={!selected || sending}
                className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {sending ? "Envoi..." : selected ? `Offrir ${selected.name} · 💰 ${selected.costCoins}` : "Choisis un cadeau"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Emoji par type de cadeau (fallback si iconUrl pas loadable)
function giftEmojiFromSlug(slug: string): string {
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
