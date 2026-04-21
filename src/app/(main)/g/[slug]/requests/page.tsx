import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { RequestsList } from "./requests-list";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function JoinRequestsPage({ params }: PageProps) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=/g/${slug}/requests`);

  const group = await db.group.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      ownerId: true,
      memberships: {
        where: { userId: session.user.id },
        select: { role: true },
      },
    },
  });

  if (!group) notFound();

  const me = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  const isPlatformStaff = me?.role === "ADMIN" || me?.role === "MODERATOR";
  const groupRole = group.memberships[0]?.role;
  const canManage =
    group.ownerId === session.user.id ||
    groupRole === "MODERATOR" ||
    groupRole === "ADMIN" ||
    isPlatformStaff;

  if (!canManage) redirect(`/g/${slug}`);

  const requests = await db.groupJoinRequest.findMany({
    where: { groupId: group.id, status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          level: true,
          createdAt: true,
        },
      },
    },
  });

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Link href={`/g/${slug}`} className="text-sm text-muted-foreground hover:text-foreground">
          ← Retour au groupe
        </Link>
      </div>

      <Card>
        <CardContent className="p-6">
          <h1 className="text-2xl font-bold mb-1">Demandes pour rejoindre</h1>
          <p className="text-sm text-muted-foreground mb-4">
            {group.name} · {requests.length} demande{requests.length > 1 ? "s" : ""} en attente
          </p>

          <RequestsList slug={slug} requests={requests.map(r => ({
            ...r,
            createdAt: r.createdAt.toISOString(),
            user: { ...r.user, createdAt: r.user.createdAt.toISOString() },
          }))} />
        </CardContent>
      </Card>
    </div>
  );
}
