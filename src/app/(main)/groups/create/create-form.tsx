"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface Category {
  id: string;
  slug: string;
  name: string;
  emoji: string | null;
}

export function CreateGroupForm({
  categories,
  cost,
}: {
  categories: Category[];
  cost: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // État du formulaire
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">("PUBLIC");
  const [isNSFW, setIsNSFW] = useState(false);
  const [tagsInput, setTagsInput] = useState("");

  // Auto-génère le slug depuis le nom tant que l'utilisateur n'a pas touché au champ
  const autoSlug = useMemo(() => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // enlever accents
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40);
  }, [name]);

  const effectiveSlug = slugTouched ? slug : autoSlug;

  const tags = useMemo(() => {
    return tagsInput
      .split(/[, ]+/)
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length >= 2 && /^[a-z0-9]+$/.test(t))
      .slice(0, 5);
  }, [tagsInput]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug: effectiveSlug,
          description,
          categoryId,
          visibility,
          isNSFW,
          tags,
        }),
      });

      const body = await res.json();

      if (!res.ok) {
        if (body.details?.fieldErrors) {
          const firstField = Object.keys(body.details.fieldErrors)[0];
          setError(body.details.fieldErrors[firstField]?.[0] || body.error);
        } else {
          setError(body.error || "Erreur");
        }
        return;
      }

      router.push(`/g/${body.group.slug}`);
      router.refresh();
    } catch (err) {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="name">Nom du groupe *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={50}
          placeholder="One Piece RP"
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="slug">URL du groupe *</Label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">anonrp.com/g/</span>
          <Input
            id="slug"
            value={effectiveSlug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            required
            pattern="[a-z0-9-]{3,40}"
            placeholder="one-piece-rp"
            disabled={loading}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          3-40 caractères : lettres minuscules, chiffres, tirets uniquement
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          minLength={10}
          maxLength={1000}
          rows={4}
          placeholder="De quoi parle ce groupe ? Quelles sont les règles ?"
          disabled={loading}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        />
        <p className="text-xs text-muted-foreground">{description.length}/1000</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Catégorie *</Label>
        <select
          id="category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          required
          disabled={loading}
          className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">— Choisir —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.emoji} {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tags">Tags (optionnel)</Label>
        <Input
          id="tags"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="shonen, luffy, pirate"
          disabled={loading}
        />
        <p className="text-xs text-muted-foreground">
          5 max, séparés par virgule ou espace. Aperçu :{" "}
          {tags.length > 0 ? tags.map((t) => `#${t}`).join(" ") : "aucun"}
        </p>
      </div>

      <div className="space-y-3">
        <Label>Visibilité *</Label>
        <div className="grid md:grid-cols-2 gap-3">
          <VisibilityOption
            value="PUBLIC"
            selected={visibility === "PUBLIC"}
            onSelect={() => setVisibility("PUBLIC")}
            title="🌍 Public"
            description="Tout le monde peut rejoindre sans approbation. Meilleur pour la mise en avant."
          />
          <VisibilityOption
            value="PRIVATE"
            selected={visibility === "PRIVATE"}
            onSelect={() => setVisibility("PRIVATE")}
            title="🔒 Privé"
            description="Les nouveaux membres doivent être approuvés par un modérateur."
          />
        </div>
      </div>

      <div className="flex items-start gap-2 pt-2">
        <Checkbox
          id="nsfw"
          checked={isNSFW}
          onChange={(e) => setIsNSFW(e.target.checked)}
          disabled={loading}
        />
        <Label htmlFor="nsfw" className="text-sm font-normal leading-tight">
          Contenu réservé aux adultes (18+). À activer si le groupe autorise du contenu sexuel ou violent.
        </Label>
      </div>

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
          {error}
        </div>
      )}

      <div className="pt-2">
        <Button type="submit" className="w-full" disabled={loading || !categoryId}>
          {loading ? "Création..." : `Créer le groupe (${cost} coins)`}
        </Button>
      </div>
    </form>
  );
}

function VisibilityOption({
  selected,
  onSelect,
  title,
  description,
}: {
  value: string;
  selected: boolean;
  onSelect: () => void;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`text-left p-3 rounded-lg border-2 transition-colors ${
        selected
          ? "border-primary bg-primary/10"
          : "border-border hover:border-border/80"
      }`}
    >
      <div className="font-semibold text-sm">{title}</div>
      <div className="text-xs text-muted-foreground mt-1">{description}</div>
    </button>
  );
}
