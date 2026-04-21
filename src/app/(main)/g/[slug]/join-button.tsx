"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Props {
  slug: string;
  isMember: boolean;
  isOwner: boolean;
  visibility: "PUBLIC" | "PRIVATE";
  pendingRequest: { status: string; createdAt: Date } | null;
}

export function JoinButton({ slug, isMember, isOwner, visibility, pendingRequest }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMessageInput, setShowMessageInput] = useState(false);
  const [message, setMessage] = useState("");

  // Le créateur ne peut pas quitter son propre groupe
  if (isOwner) {
    return <Button variant="outline" disabled>👑 Tu es le créateur</Button>;
  }

  // Déjà membre : bouton quitter
  if (isMember) {
    async function handleLeave() {
      if (!confirm("Tu es sûr de vouloir quitter ce groupe ?")) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/groups/${slug}/join`, { method: "DELETE" });
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
      <div className="flex flex-col gap-2">
        <Button variant="outline" onClick={handleLeave} disabled={loading}>
          {loading ? "..." : "✓ Membre · Quitter"}
        </Button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  // Demande déjà en attente
  if (pendingRequest?.status === "PENDING") {
    return (
      <Button variant="outline" disabled>
        ⏳ Demande en attente
      </Button>
    );
  }

  // Demande déjà rejetée
  if (pendingRequest?.status === "REJECTED") {
    return (
      <Button variant="outline" disabled>
        ❌ Demande refusée
      </Button>
    );
  }

  // Groupe privé : afficher le champ message
  async function handleJoin() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/groups/${slug}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(visibility === "PRIVATE" ? { message } : {}),
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

  if (visibility === "PRIVATE" && !showMessageInput) {
    return (
      <Button onClick={() => setShowMessageInput(true)}>
        🔒 Demander à rejoindre
      </Button>
    );
  }

  if (visibility === "PRIVATE" && showMessageInput) {
    return (
      <div className="flex flex-col gap-2 w-full max-w-md">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={300}
          rows={2}
          placeholder="Message optionnel pour les modérateurs..."
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          disabled={loading}
        />
        <div className="flex gap-2">
          <Button onClick={handleJoin} disabled={loading}>
            {loading ? "Envoi..." : "Envoyer ma demande"}
          </Button>
          <Button variant="outline" onClick={() => setShowMessageInput(false)} disabled={loading}>
            Annuler
          </Button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  // Public : rejoindre direct
  return (
    <div className="flex flex-col gap-2">
      <Button onClick={handleJoin} disabled={loading}>
        {loading ? "..." : "+ Rejoindre"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
