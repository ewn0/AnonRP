"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface RequestUser {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  level: number;
  createdAt: string;
}

interface Request {
  id: string;
  message: string | null;
  createdAt: string;
  user: RequestUser;
}

interface Props {
  slug: string;
  requests: Request[];
}

export function RequestsList({ slug, requests: initial }: Props) {
  const router = useRouter();
  const [requests, setRequests] = useState<Request[]>(initial);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(id: string, action: "approve" | "reject") {
    if (loading) return;
    if (action === "reject" && !confirm("Refuser cette demande ?")) return;

    setLoading(id + ":" + action);
    setError(null);

    const note = action === "reject" ? prompt("Raison (optionnelle, visible par le demandeur) :") ?? undefined : undefined;

    try {
      const res = await fetch(`/api/groups/${slug}/requests/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "Erreur");
        return;
      }
      setRequests((prev) => prev.filter((r) => r.id !== id));
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  if (requests.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Aucune demande en attente pour ce groupe.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {requests.map((r) => {
        const initials = (r.user.displayName || r.user.username).substring(0, 2).toUpperCase();
        return (
          <li key={r.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 border border-border/50">
            <Link href={`/u/${r.user.username}`} className="shrink-0">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold overflow-hidden">
                {r.user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.user.avatarUrl} alt={r.user.username} className="w-full h-full object-cover" />
                ) : (
                  initials
                )}
              </div>
            </Link>

            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Link href={`/u/${r.user.username}`} className="font-semibold hover:text-primary">
                  {r.user.displayName || r.user.username}
                </Link>
                <span className="text-xs text-muted-foreground">@{r.user.username}</span>
                <span className="text-xs text-muted-foreground">niv. {r.user.level}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Compte créé le {new Date(r.user.createdAt).toLocaleDateString("fr-FR")}{" "}
                · Demande envoyée le {new Date(r.createdAt).toLocaleDateString("fr-FR")}
              </p>
              {r.message && (
                <p className="text-sm p-2 rounded bg-card italic border-l-2 border-primary/50">
                  "{r.message}"
                </p>
              )}
            </div>

            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => act(r.id, "approve")}
                disabled={loading !== null}
                className="px-3 py-1.5 rounded-md text-sm bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
              >
                {loading === r.id + ":approve" ? "..." : "✓ Accepter"}
              </button>
              <button
                onClick={() => act(r.id, "reject")}
                disabled={loading !== null}
                className="px-3 py-1.5 rounded-md text-sm border border-destructive/30 text-destructive hover:bg-destructive/10 disabled:opacity-50"
              >
                {loading === r.id + ":reject" ? "..." : "✗ Refuser"}
              </button>
            </div>
          </li>
        );
      })}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </ul>
  );
}
