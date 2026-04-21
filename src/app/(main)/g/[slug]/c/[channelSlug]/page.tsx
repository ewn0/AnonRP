import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { ChatView } from "./chat-view";

interface PageProps {
  params: Promise<{ slug: string; channelSlug: string }>;
}

export default async function ChannelPage({ params }: PageProps) {
  const { slug, channelSlug } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=/g/${slug}/c/${channelSlug}`);

  const me = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  const currentUserRole = me?.role ?? "MEMBER";
  const isPlatformAdmin = currentUserRole === "ADMIN";
  const isPlatformMod = currentUserRole === "MODERATOR";
  const isPlatformStaff = isPlatformAdmin || isPlatformMod;

  const group = await db.group.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      memberships: {
        where: { userId: session.user.id },
        select: { role: true, mutedUntil: true },
      },
    },
  });

  if (!group) notFound();

  const membership = group.memberships[0];
  const isMember = !!membership;

  // Bypass pour staff plateforme, sinon redirect
  if (!isMember && !isPlatformStaff) {
    redirect(`/g/${slug}`);
  }

  const channel = await db.channel.findUnique({
    where: { groupId_slug: { groupId: group.id, slug: channelSlug } },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      type: true,
      isSystem: true,
      isLocked: true,
      writePermission: true,
      isDeleted: true,
    },
  });

  if (!channel || channel.isDeleted) notFound();

  const isGroupMod = membership?.role === "MODERATOR" || membership?.role === "ADMIN";
  const canModerate = isGroupMod || isPlatformStaff;
  const canSeeDeleted = canModerate;

  const messages = await db.channelMessage.findMany({
    where: {
      channelId: channel.id,
      ...(canSeeDeleted ? {} : { isDeleted: false }),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      content: true,
      createdAt: true,
      isEdited: true,
      editedAt: true,
      replyToId: true,
      isDeleted: true,
      deletedReason: true,
      replyTo: {
        select: {
          id: true,
          content: true,
          isDeleted: true,
          author: { select: { username: true, displayName: true } },
        },
      },
      author: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          level: true,
          role: true,
          premiumTier: true,
        },
      },
    },
  });

  const isMuted = !!(membership?.mutedUntil && membership.mutedUntil > new Date());

  let canWrite = !channel.isLocked && !isMuted;
  if (channel.writePermission === "READ_ONLY") canWrite = false;
  if (channel.writePermission === "MODS_ONLY" && !isGroupMod && !isPlatformStaff) canWrite = false;
  // Staff plateforme non-membre peut quand même poster (en tant qu'admin)
  if (!isMember && !isPlatformStaff) canWrite = false;

  return (
    <ChatView
      channel={channel}
      initialMessages={messages.reverse()}
      currentUserId={session.user.id}
      currentUserRole={currentUserRole}
      canWrite={canWrite}
      isMod={isGroupMod || isPlatformStaff}
      mutedUntil={membership?.mutedUntil ?? null}
      groupSlug={slug}
    />
  );
}
