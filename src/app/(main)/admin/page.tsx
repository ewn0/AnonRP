import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";

export default async function AdminHomePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const me = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (me?.role !== "ADMIN" && me?.role !== "MODERATOR") redirect("/feed");

  const [pendingReports, pendingNameChanges, bannedUsers, unverifiedUsers] = await Promise.all([
    db.report.count({ where: { status: "PENDING" } }),
    me.role === "ADMIN" ? db.groupNameChangeRequest.count({ where: { status: "PENDING" } }) : Promise.resolve(0),
    db.user.count({ where: { isBanned: true } }),
    db.user.count({ where: { emailVerified: null } }),
  ]);

  const sections = [
    {
      title: "Signalements",
      description: "Signalements en attente de traitement",
      href: "/admin/reports",
      badge: pendingReports,
      badgeColor: pendingReports > 0 ? "destructive" : "muted",
      visible: true,
    },
    {
      title: "Changements de nom",
      description: "Demandes de renommage de groupes",
      href: "/admin/name-changes",
      badge: pendingNameChanges,
      badgeColor: pendingNameChanges > 0 ? "amber" : "muted",
      visible: me.role === "ADMIN",
    },
    {
      title: "Utilisateurs",
      description: "Gérer bans, rôles, emails",
      href: "/admin/users",
      badge: unverifiedUsers,
      badgeColor: "muted",
      badgeLabel: `${unverifiedUsers} non vérifiés`,
      visible: me.role === "ADMIN",
    },
    {
      title: "Audit log",
      description: "Toutes les actions tracées",
      href: "/admin/audit",
      visible: me.role === "ADMIN",
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <h1 className="text-3xl font-bold">Panel admin</h1>

      <div className="grid md:grid-cols-2 gap-3">
        {sections.filter((s) => s.visible).map((s) => (
          <Link key={s.href} href={s.href}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center justify-between gap-2">
                <div>
                  <h2 className="font-semibold">{s.title}</h2>
                  <p className="text-sm text-muted-foreground">{s.description}</p>
                </div>
                {typeof s.badge === "number" && (
                  <span
                    className={`shrink-0 px-2 py-1 rounded-full text-xs font-semibold ${
                      s.badgeColor === "destructive"
                        ? "bg-destructive/20 text-destructive"
                        : s.badgeColor === "amber"
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {(s as any).badgeLabel ?? s.badge}
                  </span>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="text-xs text-muted-foreground p-3 rounded bg-muted/30 border border-border/50">
        <p>Rôle : <strong>{me.role}</strong></p>
        {me.role !== "ADMIN" && <p>Les ADMIN ont accès à plus de fonctionnalités.</p>}
      </div>
    </div>
  );
}
