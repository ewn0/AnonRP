import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { NameChangeReviewActions } from "./name-change-review-actions";

export default async function AdminNameChangesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const me = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (me?.role !== "ADMIN") redirect("/feed");

  const requests = await db.groupNameChangeRequest.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: {
      group: {
        select: { slug: true, memberCount: true, activeMembersCount24h: true },
      },
      requester: {
        select: { username: true, displayName: true },
      },
    },
  });

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
          ← Retour
        </Link>
        <h1 className="text-3xl font-bold">Changements de nom de groupes</h1>
        <span className="text-muted-foreground">({requests.length})</span>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Aucune demande en attente.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <Link href={`/g/${r.group.slug}`} className="font-semibold hover:text-primary">
                    {r.currentName}
                  </Link>
                  <span className="text-xl">→</span>
                  <span className="font-semibold text-primary">{r.proposedName}</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {new Date(r.createdAt).toLocaleString("fr-FR")}
                  </span>
                </div>

                <div className="text-sm text-muted-foreground">
                  Demandé par{" "}
                  <Link href={`/u/${r.requester.username}`} className="text-primary hover:underline">
                    @{r.requester.username}
                  </Link>
                  {" · "}
                  {r.group.memberCount} membres{" · "}
                  {r.group.activeMembersCount24h} actifs / 24h
                </div>

                {r.reason && (
                  <p className="text-sm p-2 rounded bg-muted/30 italic">
                    "{r.reason}"
                  </p>
                )}

                <NameChangeReviewActions requestId={r.id} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
