import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";

export default async function AdminReportsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const me = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (me?.role !== "ADMIN" && me?.role !== "MODERATOR") redirect("/feed");

  const reports = await db.report.findMany({
    where: { status: { in: ["PENDING", "INVESTIGATING"] } },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      reason: true,
      description: true,
      status: true,
      targetType: true,
      targetId: true,
      createdAt: true,
      reporter: {
        select: { username: true, displayName: true, avatarUrl: true },
      },
      reportedUser: {
        select: { username: true, displayName: true, avatarUrl: true, level: true },
      },
    },
  });

  const reasonLabels: Record<string, string> = {
    SPAM: "Spam",
    HARASSMENT: "Harcèlement",
    HATE_SPEECH: "Propos haineux",
    SEXUAL_CONTENT: "Contenu sexuel",
    MINOR_SAFETY: "Protection des mineurs",
    VIOLENCE: "Violence",
    ILLEGAL_CONTENT: "Contenu illégal",
    IMPERSONATION: "Usurpation",
    OTHER: "Autre",
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
          ← Retour
        </Link>
        <h1 className="text-3xl font-bold">Signalements</h1>
        <span className="text-muted-foreground">({reports.length})</span>
      </div>

      {reports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Aucun signalement en attente 🎉
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4 flex gap-4">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs px-2 py-0.5 rounded bg-destructive/20 text-destructive">
                      {reasonLabels[r.reason] ?? r.reason}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.createdAt).toLocaleString("fr-FR")}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {r.status}
                    </span>
                  </div>

                  <div className="text-sm space-y-0.5">
                    <div>
                      <span className="text-muted-foreground">Signalé par :</span>{" "}
                      <Link href={`/u/${r.reporter.username}`} className="text-primary hover:underline">
                        @{r.reporter.username}
                      </Link>
                    </div>
                    {r.reportedUser && (
                      <div>
                        <span className="text-muted-foreground">Concerne :</span>{" "}
                        <Link href={`/u/${r.reportedUser.username}`} className="text-primary hover:underline">
                          @{r.reportedUser.username}
                        </Link>{" "}
                        <span className="text-xs text-muted-foreground">(niv. {r.reportedUser.level})</span>
                      </div>
                    )}
                  </div>

                  {r.description && (
                    <p className="text-sm p-2 rounded bg-muted/30 italic">
                      "{r.description}"
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  <Link
                    href={`/admin/reports/${r.id}`}
                    className="px-3 py-1.5 rounded-md text-sm bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Voir retranscription
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
