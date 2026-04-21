"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export function RegisterForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      email: formData.get("email") as string,
      username: formData.get("username") as string,
      password: formData.get("password") as string,
      passwordConfirm: formData.get("passwordConfirm") as string,
      isAdult: formData.get("isAdult") === "on",
      acceptTerms: formData.get("acceptTerms") === "on",
    };

    try {
      // URL corrigée : /api/register au lieu de /api/auth/register
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const body = await res.json();

      if (!res.ok) {
        if (body.details?.fieldErrors) {
          const firstField = Object.keys(body.details.fieldErrors)[0];
          const firstError = body.details.fieldErrors[firstField]?.[0];
          setError(firstError || body.error || "Erreur d'inscription");
        } else {
          setError(body.error || "Erreur d'inscription");
        }
        return;
      }

      setSuccess(body.message || "Compte créé ! Vérifie ta boîte mail.");
      setTimeout(() => {
        router.push("/verify-email?status=sent");
      }, 2000);
    } catch (err) {
      setError("Erreur réseau, réessaie");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={loading}
          placeholder="toi@exemple.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="username">Nom d'utilisateur</Label>
        <Input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          disabled={loading}
          placeholder="MonPseudo"
          pattern="[a-zA-Z0-9_-]{3,20}"
          title="3-20 caractères : lettres, chiffres, _ et -"
        />
        <p className="text-xs text-muted-foreground">
          3 à 20 caractères, lettres/chiffres/_/-
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Mot de passe</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          disabled={loading}
          minLength={10}
        />
        <p className="text-xs text-muted-foreground">
          Minimum 10 caractères, avec majuscule, minuscule et chiffre
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="passwordConfirm">Confirmer le mot de passe</Label>
        <Input
          id="passwordConfirm"
          name="passwordConfirm"
          type="password"
          autoComplete="new-password"
          required
          disabled={loading}
        />
      </div>

      <div className="flex items-start gap-2 pt-2">
        <Checkbox id="isAdult" name="isAdult" required disabled={loading} />
        <Label htmlFor="isAdult" className="text-sm font-normal leading-tight">
          Je confirme être majeur(e) (18 ans ou plus)
        </Label>
      </div>

      <div className="flex items-start gap-2">
        <Checkbox id="acceptTerms" name="acceptTerms" required disabled={loading} />
        <Label htmlFor="acceptTerms" className="text-sm font-normal leading-tight">
          J'accepte les{" "}
          <a href="/cgu" target="_blank" className="text-primary hover:underline">
            CGU
          </a>{" "}
          et la{" "}
          <a href="/confidentialite" target="_blank" className="text-primary hover:underline">
            politique de confidentialité
          </a>
        </Label>
      </div>

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
          {error}
        </div>
      )}

      {success && (
        <div className="text-sm text-green-400 bg-green-500/10 p-3 rounded-md">
          {success}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Création..." : "Créer mon compte"}
      </Button>
    </form>
  );
}
