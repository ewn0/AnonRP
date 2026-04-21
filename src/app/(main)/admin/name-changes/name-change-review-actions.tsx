"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NameChangeReviewActions({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function act(action: "approve" | "reject") {
    if (loading) return;
    const confirmMsg = action === "approve" ? "Approuver ce changement de nom ?" : "Refuser cette demande ?";
    if (!confirm(confirmMsg)) return;

    setLoading(action);
    setError(null);
    try {
      const res = await fetch(`/api/admin/name-changes/${requestId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note: note || undefined }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "Erreur");
        return;
      }
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note optionnelle (visible par le demandeur)"
        maxLength={500}
        className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
      />
      <div className="flex gap-2">
        <button
          onClick={() => act("approve")}
          disabled={loading !== null}
          className="px-3 py-1.5 rounded-md text-sm bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
        >
          {loading === "approve" ? "..." : "✓ Approuver"}
        </button>
        <button
          onClick={() => act("reject")}
          disabled={loading !== null}
          className="px-3 py-1.5 rounded-md text-sm bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
        >
          {loading === "reject" ? "..." : "✗ Refuser"}
        </button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
