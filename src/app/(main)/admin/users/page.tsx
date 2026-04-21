import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { AdminUsersTable } from "./users-table";

interface PageProps {
  searchParams: Promise<{ q?: string; filter?: string; page?: string }>;
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const me = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (me?.role !== "ADMIN") redirect("/feed");

  const { q = "", filter = "all", page: pageStr = "1" } = await searchParams;
  const page = Math.max(1, parseInt(pageStr, 10));
  const limit = 50;

  const where: any = {};
  if (q) {
    where.OR = [
      { email: { contains: q, mode: "insensitive" } },
      { username: { contains: q, mode: "insensitive" } },
    ];
  }
  if (filter === "unverified") where.emailVerified = null;
  else if (filter === "banned") where.isBanned = true;

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        emailVerified: true,
        isBanned: true,
        banReason: true,
        role: true,
        premiumTier: true,
        level: true,
        coins: true,
        createdAt: true,
        lastSeenAt: true,
      },
    }),
    db.user.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
          ← Retour
        </Link>
        <h1 className="text-3xl font-bold">Utilisateurs</h1>
        <span className="text-muted-foreground">({total})</span>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-2">
        <form action="/admin/users" className="flex gap-2 flex-1 min-w-64">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Chercher par email ou username..."
            className="flex-1 h-10 rounded-md border border-input bg-background px-3 text-sm"
          />
          {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
        </form>

        <div className="flex gap-2 text-sm">
          <FilterLink label="Tous" value="all" active={filter === "all"} q={q} />
          <FilterLink label="Non vérifiés" value="unverified" active={filter === "unverified"} q={q} />
          <FilterLink label="Bannis" value="banned" active={filter === "banned"} q={q} />
        </div>
      </div>

      <AdminUsersTable users={users} currentUserId={session.user.id} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {page > 1 && (
            <Link
              href={`/admin/users?${new URLSearchParams({ q, filter, page: String(page - 1) })}`}
              className="px-3 py-1 rounded border border-border hover:bg-accent text-sm"
            >
              ← Précédent
            </Link>
          )}
          <span className="px-3 py-1 text-sm text-muted-foreground">
            Page {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/admin/users?${new URLSearchParams({ q, filter, page: String(page + 1) })}`}
              className="px-3 py-1 rounded border border-border hover:bg-accent text-sm"
            >
              Suivant →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function FilterLink({ label, value, active, q }: { label: string; value: string; active: boolean; q: string }) {
  const params = new URLSearchParams();
  if (value !== "all") params.set("filter", value);
  if (q) params.set("q", q);
  const href = params.toString() ? `/admin/users?${params}` : "/admin/users";

  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
        active ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"
      }`}
    >
      {label}
    </Link>
  );
}
