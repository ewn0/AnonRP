"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  reportId: string;
  targetMessageId: string;
  isMessage: boolean;
}

export function ReportActions({ reportId, targetMessageId, isMessage }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(action: "resolve" | "dismiss" | "delete_and_resolve") {
    if (loading) return;
    const confirmMsg = {
      resolve: "Marquer ce signalement comme résolu ?",
      dismiss: "Rejeter ce signalement ?",
      delete_and_resolve: "Supprimer le message signalé ET marquer comme résolu ?",
    }[action];

    if (!confirm(confirmMsg)) return;

    setLoading(action);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reports/${reportId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "Erreur");
        return;
      }
      router.refresh();
      router.push("/admin/reports");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex gap-2 flex-wrap">
      <button
        onClick={() => act("resolve")}
        disabled={loading !== null}
        className="px-3 py-1.5 rounded-md text-sm bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
      >
        {loading === "resolve" ? "..." : "✓ Résolu (pas d'action)"}
      </button>

      {isMessage && (
        <button
          onClick={() => act("delete_and_resolve")}
          disabled={loading !== null}
          className="px-3 py-1.5 rounded-md text-sm bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
        >
          {loading === "delete_and_resolve" ? "..." : "🗑️ Supprimer le message"}
        </button>
      )}

      <button
        onClick={() => act("dismiss")}
        disabled={loading !== null}
        className="px-3 py-1.5 rounded-md text-sm border border-border hover:bg-accent disabled:opacity-50"
      >
        {loading === "dismiss" ? "..." : "Rejeter (abus)"}
      </button>

      {error && <p className="w-full text-sm text-destructive">{error}</p>}
    </div>
  );
}
