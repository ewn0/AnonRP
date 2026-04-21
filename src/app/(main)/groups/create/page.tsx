import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateGroupForm } from "./create-form";

export default async function CreateGroupPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/groups/create");

  // Récupérer les catégories + infos user
  const [categories, user, config] = await Promise.all([
    db.groupCategory.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
      select: { id: true, slug: true, name: true, emoji: true },
    }),
    db.user.findUnique({
      where: { id: session.user.id },
      select: { coins: true, level: true, premiumTier: true, premiumUntil: true },
    }),
    db.appConfig.findMany({
      where: {
        key: {
          in: ["group_creation_cost", "group_creation_cost_premium", "group_creation_min_level"],
        },
      },
    }),
  ]);

  if (!user) redirect("/login");

  const configMap = Object.fromEntries(config.map((c) => [c.key, c.value]));
  const isPremium = !!user.premiumTier && user.premiumUntil && user.premiumUntil > new Date();
  const cost = isPremium
    ? (configMap.group_creation_cost_premium as number) ?? 100
    : (configMap.group_creation_cost as number) ?? 200;
  const minLevel = (configMap.group_creation_min_level as number) ?? 5;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Créer un groupe</h1>
        <p className="text-muted-foreground mt-1">Lance ta propre communauté.</p>
      </div>

      {/* Infos utilisateur */}
      <Card>
        <CardContent className="p-4 flex justify-between items-center text-sm">
          <div>
            <div className="text-muted-foreground">Ton solde</div>
            <div className="font-semibold text-lg">💰 {user.coins.toLocaleString()} coins</div>
          </div>
          <div>
            <div className="text-muted-foreground">Ton niveau</div>
            <div className="font-semibold text-lg">⭐ {user.level}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Coût de création</div>
            <div className="font-semibold text-lg">{cost} coins</div>
          </div>
        </CardContent>
      </Card>

      {/* Erreurs éventuelles */}
      {user.level < minLevel && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="p-4 text-sm">
            ⚠️ Il faut être <strong>niveau {minLevel}</strong> pour créer un groupe. Tu es actuellement niveau {user.level}. Écris des posts et commentaires pour gagner de l'XP !
          </CardContent>
        </Card>
      )}

      {user.coins < cost && user.level >= minLevel && (
        <Card className="border-amber-500/50 bg-amber-500/10">
          <CardContent className="p-4 text-sm">
            ⚠️ Il te manque <strong>{cost - user.coins} coins</strong> pour créer un groupe. Participe aux forums ou achète des coins !
          </CardContent>
        </Card>
      )}

      {/* Formulaire */}
      {user.level >= minLevel && user.coins >= cost && (
        <Card>
          <CardHeader>
            <CardTitle>Paramètres du groupe</CardTitle>
            <CardDescription>Tous les champs sont modifiables plus tard.</CardDescription>
          </CardHeader>
          <CardContent>
            <CreateGroupForm categories={categories} cost={cost} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
