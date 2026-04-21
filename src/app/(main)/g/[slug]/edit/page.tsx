import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { EditGroupForm } from "./edit-group-form";
import { getActiveMembers24h } from "@/lib/group-activity";
import { getConfig } from "@/lib/coins";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function EditGroupPage({ params }: PageProps) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=/g/${slug}/edit`);

  const group = await db.group.findUnique({
    where: { slug },
    include: {
      category: { select: { id: true, name: true, emoji: true } },
    },
  });

  if (!group) notFound();

  const platformUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  const isPlatformAdmin = platformUser?.role === "ADMIN";
  const isOwner = group.ownerId === session.user.id;

  if (!isOwner && !isPlatformAdmin) redirect(`/g/${slug}`);

  if (group.isSystemGroup && !isPlatformAdmin) {
    redirect(`/g/${slug}`);
  }

  // Catégories disponibles
  const categories = await db.groupCategory.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: "asc" },
    select: { id: true, name: true, emoji: true },
  });

  // Calcul du seuil + nombre d'actifs pour informer
  const threshold = await getConfig<number>("group_name_change_threshold_active_members", 50);
  const activeMembers = await getActiveMembers24h(group.id);
  const nameChangeNeedsApproval = activeMembers >= threshold && !isPlatformAdmin;

  // Demande en cours ?
  const pendingNameRequest = await db.groupNameChangeRequest.findFirst({
    where: { groupId: group.id, status: "PENDING" },
    select: { id: true, proposedName: true, createdAt: true },
  });

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Link href={`/g/${slug}`} className="text-sm text-muted-foreground hover:text-foreground">
          ← Retour au groupe
        </Link>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <h1 className="text-2xl font-bold">Modifier "{group.name}"</h1>

          {pendingNameRequest && (
            <div className="p-3 rounded-md bg-amber-500/10 border border-amber-500/30 text-sm text-amber-300">
              Une demande de changement de nom vers <strong>"{pendingNameRequest.proposedName}"</strong> est actuellement en attente de validation par un admin.
            </div>
          )}

          <EditGroupForm
            slug={group.slug}
            initialData={{
              name: group.name,
              description: group.description,
              categoryId: group.categoryId,
              visibility: group.visibility,
              isNSFW: group.isNSFW,
              tags: group.tags,
              iconUrl: group.iconUrl,
              bannerUrl: group.bannerUrl,
            }}
            categories={categories}
            nameChangeNeedsApproval={nameChangeNeedsApproval}
            activeMembers={activeMembers}
            threshold={threshold}
            isPlatformAdmin={isPlatformAdmin}
            hasPendingRequest={!!pendingNameRequest}
          />
        </CardContent>
      </Card>
    </div>
  );
}
