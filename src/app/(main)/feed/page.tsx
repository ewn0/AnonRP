import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function FeedPage() {
  const session = await auth();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Bienvenue, {session?.user?.username} 👋</h1>
        <p className="text-muted-foreground mt-1">
          Le feed affichera bientôt les posts des groupes que tu suis.
        </p>
      </div>

      {!session?.user?.emailVerified && (
        <Card className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
          <CardHeader>
            <CardTitle className="text-base">⚠️ Email non vérifié</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            Vérifie ta boîte mail pour activer toutes les fonctionnalités.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>🚧 Phase 1 complétée</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>✅ Inscription, connexion, vérification email</p>
          <p>✅ Base de données complète</p>
          <p>✅ Middleware de protection des routes</p>
          <p>⏳ Phase 2 à venir : création de groupes, posts, commentaires, messages privés</p>
        </CardContent>
      </Card>
    </div>
  );
}
