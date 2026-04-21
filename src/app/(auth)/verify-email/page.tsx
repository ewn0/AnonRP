"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const messages = {
  sent: {
    title: "Vérifie ta boîte mail",
    description: "Un email de confirmation t'a été envoyé. Clique sur le lien dedans pour activer ton compte.",
    type: "info" as const,
  },
  success: {
    title: "Email vérifié ! ✅",
    description: "Ton compte est activé. Tu peux maintenant profiter de toutes les fonctionnalités.",
    type: "success" as const,
  },
  expired: {
    title: "Lien expiré",
    description: "Ce lien de vérification a expiré. Inscris-toi à nouveau pour recevoir un nouveau lien.",
    type: "error" as const,
  },
  invalid: {
    title: "Lien invalide",
    description: "Ce lien de vérification n'est pas valide.",
    type: "error" as const,
  },
  missing: {
    title: "Token manquant",
    description: "Aucun token de vérification fourni.",
    type: "error" as const,
  },
  error: {
    title: "Erreur",
    description: "Une erreur est survenue. Réessaie plus tard.",
    type: "error" as const,
  },
};

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const { update, data: session } = useSession();
  const status = (searchParams.get("status") as keyof typeof messages) || "sent";
  const msg = messages[status] || messages.sent;
  const [updated, setUpdated] = useState(false);

  // Quand la vérification réussit, on force la mise à jour du JWT
  // pour que l'avertissement "email non vérifié" disparaisse immédiatement
  useEffect(() => {
    if (status === "success" && session?.user && !session.user.emailVerified && !updated) {
      setUpdated(true);
      update({ emailVerified: new Date() });
    }
  }, [status, session, update, updated]);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{msg.title}</CardTitle>
        <CardDescription>{msg.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {msg.type === "success" ? (
          <Link href={session?.user ? "/feed" : "/login"}>
            <Button className="w-full">
              {session?.user ? "Accéder au forum" : "Se connecter"}
            </Button>
          </Link>
        ) : msg.type === "error" ? (
          <Link href="/register">
            <Button className="w-full" variant="outline">Retour à l'inscription</Button>
          </Link>
        ) : (
          <p className="text-sm text-muted-foreground text-center">
            Tu ne reçois pas l'email ? Vérifie tes spams ou{" "}
            <Link href="/register" className="text-primary hover:underline">
              réessaie l'inscription
            </Link>
            .
          </p>
        )}
      </CardContent>
    </Card>
  );
}
