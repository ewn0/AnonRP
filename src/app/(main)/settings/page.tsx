import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SettingsPage() {
  const session = await auth();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Paramètres</h1>
        <p className="text-muted-foreground mt-1">Gère ton compte et tes préférences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations du compte</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email</span>
            <span>{session?.user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Nom d'utilisateur</span>
            <span>{session?.user?.username}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email vérifié</span>
            <span className={session?.user?.emailVerified ? "text-green-400" : "text-amber-400"}>
              {session?.user?.emailVerified ? "Oui ✓" : "Non"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Rôle</span>
            <span>{session?.user?.role}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>🚧 Bientôt disponible</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Les options suivantes arriveront prochainement :</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Changer ton mot de passe</li>
            <li>Activer l'authentification à deux facteurs (2FA)</li>
            <li>Personnaliser ton profil (avatar, bannière, bio)</li>
            <li>Gérer tes notifications</li>
            <li>Télécharger tes données (RGPD)</li>
            <li>Supprimer ton compte</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
