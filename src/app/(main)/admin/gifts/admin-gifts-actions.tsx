"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminGiftsActions({ giftId }: { giftId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    const reason = prompt("Raison de l'annulation (visible par le sender et receiver) :");
    if (!reason) return;

    if (!confirm("Annuler ce cadeau ? Le sender sera remboursé, le boost XP retiré.")) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/gifts/${giftId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "Erreur");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      <button
        onClick={cancel}
        disabled={loading}
        className="px-3 py-1.5 rounded-md text-xs bg-destructive/80 text-destructive-foreground hover:bg-destructive disabled:opacity-50"
      >
        {loading ? "..." : "Annuler"}
      </button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
