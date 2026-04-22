"use client";

import { useState } from "react";

interface Prefs {
  emailOnMention: boolean;
  emailOnReply: boolean;
  emailOnGiftReceived: boolean;
  emailOnJoinRequestApproved: boolean;
  emailOnJoinRequestReceived: boolean;
  emailOnMessageDeleted: boolean;
  emailOnReportHandled: boolean;
  emailOnLevelUp: boolean;
}

interface Props {
  initialPrefs: Prefs;
}

const LABELS: { key: keyof Prefs; label: string; desc: string }[] = [
  { key: "emailOnMention", label: "Mentions @username", desc: "Quand quelqu'un te mentionne dans un message" },
  { key: "emailOnReply", label: "Réponses à tes messages", desc: "Quand on répond à un de tes messages" },
  { key: "emailOnGiftReceived", label: "Cadeaux reçus", desc: "Quand quelqu'un t'offre un cadeau" },
  { key: "emailOnJoinRequestApproved", label: "Demande approuvée", desc: "Quand ta demande de rejoindre un groupe est acceptée" },
  { key: "emailOnJoinRequestReceived", label: "Nouvelle demande de rejoindre", desc: "Pour les owners : quand quelqu'un veut rejoindre ton groupe" },
  { key: "emailOnMessageDeleted", label: "Message supprimé par un modo", desc: "Quand un modérateur supprime un de tes messages" },
  { key: "emailOnReportHandled", label: "Signalement traité", desc: "Quand un de tes signalements a été traité" },
  { key: "emailOnLevelUp", label: "Level up", desc: "Quand tu passes un niveau (lvl 10, 20, etc.)" },
];

export function NotificationPrefsForm({ initialPrefs }: Props) {
  const [prefs, setPrefs] = useState<Prefs>(initialPrefs);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(key: keyof Prefs) {
    const newValue = !prefs[key];
    const newPrefs = { ...prefs, [key]: newValue };
    setPrefs(newPrefs);
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/users/me/notification-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: newValue }),
      });
      if (!res.ok) {
        // Rollback
        setPrefs(prefs);
        setError("Erreur de sauvegarde");
        return;
      }
      setSavedAt(new Date());
    } catch {
      setPrefs(prefs);
      setError("Erreur réseau");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      {LABELS.map(({ key, label, desc }) => (
        <label
          key={key}
          className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/30 cursor-pointer transition-colors"
        >
          <input
            type="checkbox"
            checked={prefs[key]}
            onChange={() => toggle(key)}
            disabled={saving}
            className="mt-0.5 h-4 w-4"
          />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">{label}</div>
            <div className="text-xs text-muted-foreground">{desc}</div>
          </div>
        </label>
      ))}

      <div className="pt-3 mt-2 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {saving
            ? "Sauvegarde..."
            : savedAt
            ? `✓ Enregistré à ${savedAt.toLocaleTimeString("fr-FR")}`
            : "Les modifications sont sauvegardées automatiquement"}
        </span>
        {error && <span className="text-destructive">{error}</span>}
      </div>
    </div>
  );
}
