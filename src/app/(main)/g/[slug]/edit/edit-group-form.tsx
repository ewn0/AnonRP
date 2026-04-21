"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  slug: string;
  initialData: {
    name: string;
    description: string;
    categoryId: string | null;
    visibility: "PUBLIC" | "PRIVATE";
    isNSFW: boolean;
    tags: string[];
    iconUrl: string | null;
    bannerUrl: string | null;
  };
  categories: Array<{ id: string; name: string; emoji: string | null }>;
  nameChangeNeedsApproval: boolean;
  activeMembers: number;
  threshold: number;
  isPlatformAdmin: boolean;
  hasPendingRequest: boolean;
}

export function EditGroupForm({
  slug,
  initialData,
  categories,
  nameChangeNeedsApproval,
  activeMembers,
  threshold,
  isPlatformAdmin,
  hasPendingRequest,
}: Props) {
  const router = useRouter();

  const [name, setName] = useState(initialData.name);
  const [description, setDescription] = useState(initialData.description);
  const [categoryId, setCategoryId] = useState(initialData.categoryId ?? "");
  const [visibility, setVisibility] = useState(initialData.visibility);
  const [isNSFW, setIsNSFW] = useState(initialData.isNSFW);
  const [tagsInput, setTagsInput] = useState(initialData.tags.join(", "));
  const [iconUrl, setIconUrl] = useState(initialData.iconUrl ?? "");
  const [bannerUrl, setBannerUrl] = useState(initialData.bannerUrl ?? "");
  const [nameChangeReason, setNameChangeReason] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const nameChanged = name !== initialData.name;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    const tagsArray = tagsInput
      .split(",")
      .map((t) => t.trim().toLowerCase().replace(/[^a-z0-9]/g, ""))
      .filter((t) => t.length >= 2)
      .slice(0, 5);

    try {
      const payload: any = {
        description,
        categoryId: categoryId || undefined,
        visibility,
        isNSFW,
        tags: tagsArray,
        iconUrl: iconUrl || null,
        bannerUrl: bannerUrl || null,
      };

      if (nameChanged) {
        payload.nameChange = {
          name,
          reason: nameChangeReason || undefined,
        };
      }

      const res = await fetch(`/api/groups/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();

      if (!res.ok) {
        setError(body.error || "Erreur");
        return;
      }

      if (body.nameChange?.applied) {
        setSuccess("Modifications enregistrées.");
        router.refresh();
      } else if (body.nameChange?.requestId) {
        setSuccess("Modifications enregistrées. La demande de changement de nom a été envoyée à l'équipe admin.");
      } else {
        setSuccess("Modifications enregistrées.");
      }

      setTimeout(() => {
        router.push(`/g/${slug}`);
        router.refresh();
      }, 1500);
    } catch (err) {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Nom */}
      <div>
        <label className="text-sm font-medium">Nom du groupe</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          minLength={3}
          disabled={hasPendingRequest}
          className="w-full mt-1 h-10 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
        />
        {nameChanged && (
          <div
            className={`mt-2 p-3 rounded-md text-xs ${
              nameChangeNeedsApproval
                ? "bg-amber-500/10 border border-amber-500/30 text-amber-300"
                : "bg-primary/10 border border-primary/30 text-primary"
            }`}
          >
            {nameChangeNeedsApproval ? (
              <>
                <p className="font-semibold mb-1">⚠️ Validation admin requise</p>
                <p>
                  Ce groupe a {activeMembers} membres actifs sur 24h (seuil : {threshold}). Le changement de nom sera soumis à validation. Tu peux laisser un commentaire pour justifier :
                </p>
                <textarea
                  value={nameChangeReason}
                  onChange={(e) => setNameChangeReason(e.target.value)}
                  maxLength={500}
                  placeholder="Pourquoi ce changement ? (optionnel)"
                  rows={2}
                  className="w-full mt-2 rounded-md border border-input bg-background px-2 py-1 text-xs"
                />
              </>
            ) : (
              <p>
                {isPlatformAdmin
                  ? "En tant qu'admin plateforme, le changement sera appliqué immédiatement."
                  : `Petit groupe (${activeMembers} actifs / ${threshold}), le changement sera appliqué immédiatement.`}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="text-sm font-medium">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={1000}
          rows={4}
          required
          className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      {/* Catégorie */}
      <div>
        <label className="text-sm font-medium">Catégorie</label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="w-full mt-1 h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">— Aucune —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.emoji} {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Visibilité */}
      <div>
        <label className="text-sm font-medium">Visibilité</label>
        <div className="flex gap-3 mt-1">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={visibility === "PUBLIC"}
              onChange={() => setVisibility("PUBLIC")}
            />
            Public (tout le monde peut rejoindre)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={visibility === "PRIVATE"}
              onChange={() => setVisibility("PRIVATE")}
            />
            Privé (sur demande)
          </label>
        </div>
      </div>

      {/* NSFW */}
      <div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isNSFW}
            onChange={(e) => setIsNSFW(e.target.checked)}
          />
          Contenu adulte (18+)
        </label>
      </div>

      {/* Tags */}
      <div>
        <label className="text-sm font-medium">Tags (max 5, séparés par virgules)</label>
        <input
          type="text"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="rp, fantasy, débutant"
          className="w-full mt-1 h-10 rounded-md border border-input bg-background px-3 text-sm"
        />
        <p className="text-xs text-muted-foreground mt-1">Lettres, chiffres uniquement. 2-20 caractères par tag.</p>
      </div>

      {/* Icône */}
      <div>
        <label className="text-sm font-medium">URL de l'icône (optionnel)</label>
        <input
          type="url"
          value={iconUrl}
          onChange={(e) => setIconUrl(e.target.value)}
          placeholder="https://..."
          className="w-full mt-1 h-10 rounded-md border border-input bg-background px-3 text-sm"
        />
      </div>

      {/* Bannière */}
      <div>
        <label className="text-sm font-medium">URL de la bannière (optionnel)</label>
        <input
          type="url"
          value={bannerUrl}
          onChange={(e) => setBannerUrl(e.target.value)}
          placeholder="https://..."
          className="w-full mt-1 h-10 rounded-md border border-input bg-background px-3 text-sm"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-green-400">{success}</p>}

      <div className="flex gap-2 justify-end pt-2">
        <button
          type="button"
          onClick={() => router.push(`/g/${slug}`)}
          className="px-4 py-2 text-sm rounded-md border border-border hover:bg-accent"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "Enregistrement..." : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}
