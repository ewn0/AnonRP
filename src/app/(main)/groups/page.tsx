import Link from "next/link";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    sort?: string;
  }>;
}

export default async function GroupsPage({ searchParams }: PageProps) {
  const { q = "", category, sort = "popular" } = await searchParams;

  // Récupérer les catégories pour le filtre
  const categories = await db.groupCategory.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: "asc" },
    select: { id: true, slug: true, name: true, emoji: true },
  });

  // Construire la requête
  const where: any = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { tags: { has: q.toLowerCase() } },
    ];
  }
  if (category) {
    const cat = categories.find((c) => c.slug === category);
    if (cat) where.categoryId = cat.id;
  }

  // Tri : utilise activityScore (calculé en arrière-plan à terme) ou memberCount à défaut
  const orderBy =
    sort === "new"
      ? { createdAt: "desc" as const }
      : sort === "active"
      ? { activityScore: "desc" as const }
      : ([{ isFeatured: "desc" as const }, { memberCount: "desc" as const }] as const);

  const groups = await db.group.findMany({
    where,
    orderBy,
    take: 30,
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      iconUrl: true,
      memberCount: true,
      tags: true,
      isFeatured: true,
      isNSFW: true,
      visibility: true,
      isSystemGroup: true,
      category: { select: { name: true, emoji: true, slug: true } },
      _count: {
        select: { channels: true },
      },
    },
  });

  // Groupes mis en avant (en premier)
  const featured = groups.filter((g) => g.isFeatured);
  const regular = groups.filter((g) => !g.isFeatured);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 sm:items-center">
        <div>
          <h1 className="text-3xl font-bold">Groupes</h1>
          <p className="text-muted-foreground mt-1">
            Rejoins des communautés thématiques ou crée la tienne.
          </p>
        </div>
        <Link href="/groups/create">
          <Button>+ Créer un groupe</Button>
        </Link>
      </div>

      {/* Barre de recherche */}
      <form action="/groups" className="flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Rechercher un groupe, un tag..."
          className="flex-1 h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {category && <input type="hidden" name="category" value={category} />}
        {sort !== "popular" && <input type="hidden" name="sort" value={sort} />}
        <Button type="submit" variant="outline">Chercher</Button>
      </form>

      {/* Filtres catégorie */}
      <div className="flex flex-wrap gap-2">
        <CategoryLink
          slug=""
          name="Toutes"
          active={!category}
          q={q}
          sort={sort}
        />
        {categories.map((c) => (
          <CategoryLink
            key={c.id}
            slug={c.slug}
            name={`${c.emoji ?? ""} ${c.name}`.trim()}
            active={category === c.slug}
            q={q}
            sort={sort}
          />
        ))}
      </div>

      {/* Tri */}
      <div className="flex gap-2 text-sm">
        <SortLink label="Populaires" value="popular" active={sort === "popular"} q={q} category={category} />
        <SortLink label="Actifs" value="active" active={sort === "active"} q={q} category={category} />
        <SortLink label="Nouveaux" value="new" active={sort === "new"} q={q} category={category} />
      </div>

      {/* Mis en avant */}
      {featured.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            ⭐ Mis en avant
          </h2>
          <div className="grid md:grid-cols-2 gap-3">
            {featured.map((g) => (
              <GroupCard key={g.id} group={g} />
            ))}
          </div>
        </div>
      )}

      {/* Groupes normaux */}
      {regular.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-3">
          {regular.map((g) => (
            <GroupCard key={g.id} group={g} />
          ))}
        </div>
      ) : featured.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {q || category ? (
              <>Aucun groupe ne correspond à ta recherche.</>
            ) : (
              <>
                <p>Aucun groupe pour l'instant.</p>
                <Link href="/groups/create" className="text-primary hover:underline mt-2 inline-block">
                  Crée le premier !
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function CategoryLink({
  slug,
  name,
  active,
  q,
  sort,
}: {
  slug: string;
  name: string;
  active: boolean;
  q: string;
  sort: string;
}) {
  const params = new URLSearchParams();
  if (slug) params.set("category", slug);
  if (q) params.set("q", q);
  if (sort !== "popular") params.set("sort", sort);
  const href = params.toString() ? `/groups?${params}` : "/groups";

  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "border-border hover:bg-accent"
      }`}
    >
      {name}
    </Link>
  );
}

function SortLink({
  label,
  value,
  active,
  q,
  category,
}: {
  label: string;
  value: string;
  active: boolean;
  q: string;
  category?: string;
}) {
  const params = new URLSearchParams();
  if (value !== "popular") params.set("sort", value);
  if (q) params.set("q", q);
  if (category) params.set("category", category);
  const href = params.toString() ? `/groups?${params}` : "/groups";

  return (
    <Link
      href={href}
      className={`${
        active ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
      } transition-colors`}
    >
      {label}
    </Link>
  );
}

function GroupCard({ group }: { group: any }) {
  const channelCount = group._count?.channels ?? 0;

  return (
    <Link href={`/g/${group.slug}`}>
      <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center text-xl shrink-0">
              {group.iconUrl ? (
                <img src={group.iconUrl} alt={group.name} className="w-full h-full rounded-lg object-cover" />
              ) : (
                group.category?.emoji ?? "🏷️"
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold truncate">{group.name}</h3>
                {group.isSystemGroup && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-primary/20 text-primary">Officiel</span>
                )}
                {group.visibility === "PRIVATE" && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">🔒 Privé</span>
                )}
                {group.isNSFW && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-destructive/20 text-destructive">18+</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {group.category?.name} · {group.memberCount} membre{group.memberCount > 1 ? "s" : ""} · {channelCount} channel{channelCount > 1 ? "s" : ""}
              </p>
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{group.description}</p>
              {group.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {group.tags.slice(0, 4).map((t: string) => (
                    <span key={t} className="text-xs text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
