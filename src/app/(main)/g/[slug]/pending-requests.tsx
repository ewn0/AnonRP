"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface JoinRequest {
  id: string;
  message: string | null;
  createdAt: string;
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    level: number;
  };
}

export function PendingRequests({
  slug,
  initialCount,
}: {
  slug: string;
  initialCount: number;
}) {
  const router = useRouter();
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  async function fetchRequests() {
    setLoading(true);
    try {
      const res = await fetch(`/api/groups/${slug}/requests`);
      const body = await res.json();
      if (res.ok) setRequests(body.requests);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (expanded) fetchRequests();
  }, [expanded]);

  async function handleAction(requestId: string, action: "approve" | "reject") {
    setProcessingId(requestId);
    try {
      const res = await fetch(`/api/groups/${slug}/requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setRequests((prev) => prev.filter((r) => r.id !== requestId));
        router.refresh();
      }
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-between w-full text-left"
        >
          <CardTitle className="text-base flex items-center gap-2">
            📨 Demandes d'adhésion en attente
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
              {initialCount}
            </span>
          </CardTitle>
          <span className="text-muted-foreground text-sm">{expanded ? "▲" : "▼"}</span>
        </button>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement...</p>
          ) : requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune demande en attente.</p>
          ) : (
            requests.map((req) => (
              <div
                key={req.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-background border border-border"
              >
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold shrink-0">
                  {req.user.avatarUrl ? (
                    <img
                      src={req.user.avatarUrl}
                      alt={req.user.username}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    req.user.username.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/u/${req.user.username}`}
                    className="font-semibold text-sm hover:text-primary"
                  >
                    {req.user.displayName || req.user.username}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    @{req.user.username} · Niveau {req.user.level}
                  </p>
                  {req.message && (
                    <p className="text-sm mt-2 p-2 rounded bg-muted/50 italic">
                      "{req.message}"
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => handleAction(req.id, "approve")}
                    disabled={processingId === req.id}
                  >
                    ✓
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAction(req.id, "reject")}
                    disabled={processingId === req.id}
                  >
                    ✕
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      )}
    </Card>
  );
}
