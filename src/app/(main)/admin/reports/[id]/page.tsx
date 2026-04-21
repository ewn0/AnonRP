import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { ReportActions } from "./report-actions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ReportTranscriptPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const me = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (me?.role !== "ADMIN" && me?.role !== "MODERATOR") redirect("/feed");

  const report = await db.report.findUnique({
    where: { id },
    include: {
      reporter: { select: { username: true, displayName: true } },
      reportedUser: { select: { username: true, displayName: true, level: true } },
    },
  });

  if (!report) notFound();

  // Charger le message signalé et son contexte
  let transcriptMessages: any[] = [];
  let targetMessage: any = null;
  let channel: any = null;

  if (report.targetType === "CHANNEL_MESSAGE") {
    targetMessage = await db.channelMessage.findUnique({
      where: { id: report.targetId },
      select: {
        id: true,
        channelId: true,
        createdAt: true,
        channel: {
          select: {
            id: true,
            name: true,
            slug: true,
            group: { select: { slug: true, name: true } },
          },
        },
      },
    });

    if (targetMessage) {
      channel = targetMessage.channel;

      // 25 messages AVANT le signalé
      const before = await db.channelMessage.findMany({
        where: {
          channelId: targetMessage.channelId,
          createdAt: { lt: targetMessage.createdAt },
        },
        orderBy: { createdAt: "desc" },
        take: 25,
        select: {
          id: true,
          content: true,
          createdAt: true,
          isDeleted: true,
          deletedReason: true,
          author: { select: { username: true, displayName: true, role: true } },
        },
      });

      // 25 messages APRÈS (incluant le signalé)
      const after = await db.channelMessage.findMany({
        where: {
          channelId: targetMessage.channelId,
          createdAt: { gte: targetMessage.createdAt },
        },
        orderBy: { createdAt: "asc" },
        take: 25,
        select: {
          id: true,
          content: true,
          createdAt: true,
          isDeleted: true,
          deletedReason: true,
          author: { select: { username: true, displayName: true, role: true } },
        },
      });

      transcriptMessages = [...before.reverse(), ...after];
    }
  }

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
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/admin/reports" className="text-sm text-muted-foreground hover:text-foreground">
          ← Retour aux signalements
        </Link>
      </div>

      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold">🚩 Signalement</h1>
            <span className="text-xs px-2 py-0.5 rounded bg-destructive/20 text-destructive">
              {reasonLabels[report.reason] ?? report.reason}
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {report.status}
            </span>
          </div>

          <div className="text-sm space-y-1">
            <p>
              <span className="text-muted-foreground">Par :</span>{" "}
              <Link href={`/u/${report.reporter.username}`} className="text-primary hover:underline">
                @{report.reporter.username}
              </Link>
              <span className="text-xs text-muted-foreground ml-2">
                {new Date(report.createdAt).toLocaleString("fr-FR")}
              </span>
            </p>
            {report.reportedUser && (
              <p>
                <span className="text-muted-foreground">Cible :</span>{" "}
                <Link href={`/u/${report.reportedUser.username}`} className="text-primary hover:underline">
                  @{report.reportedUser.username}
                </Link>{" "}
                <span className="text-xs text-muted-foreground">(niv. {report.reportedUser.level})</span>
              </p>
            )}
            {channel && (
              <p>
                <span className="text-muted-foreground">Dans :</span>{" "}
                <Link href={`/g/${channel.group.slug}/c/${channel.slug}`} className="text-primary hover:underline">
                  {channel.group.name} / #{channel.name}
                </Link>
              </p>
            )}
          </div>

          {report.description && (
            <div className="text-sm p-3 rounded bg-muted/30 italic border-l-2 border-destructive mt-3">
              {report.description}
            </div>
          )}

          {report.status === "PENDING" && (
            <div className="pt-3">
              <ReportActions reportId={report.id} targetMessageId={report.targetId} isMessage={report.targetType === "CHANNEL_MESSAGE"} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Retranscription */}
      <Card>
        <CardContent className="p-4">
          <h2 className="font-semibold mb-3">Retranscription ({transcriptMessages.length} messages)</h2>
          {transcriptMessages.length === 0 ? (
            <p className="text-sm text-muted-foreground">Pas de contexte disponible.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {transcriptMessages.map((msg) => {
                const isTarget = msg.id === report.targetId;
                const time = new Date(msg.createdAt).toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                });

                return (
                  <li
                    key={msg.id}
                    className={`p-2 rounded ${
                      isTarget
                        ? "bg-destructive/10 border-l-4 border-destructive"
                        : msg.isDeleted
                        ? "bg-muted/20 opacity-60"
                        : "hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-baseline gap-2">
                      <Link
                        href={`/u/${msg.author.username}`}
                        className="font-semibold hover:text-primary"
                      >
                        {msg.author.displayName || msg.author.username}
                      </Link>
                      {msg.author.role === "ADMIN" && (
                        <span className="text-[9px] px-1 rounded bg-destructive/20 text-destructive">admin</span>
                      )}
                      <span className="text-xs text-muted-foreground">{time}</span>
                      {isTarget && (
                        <span className="text-xs font-semibold text-destructive">← Message signalé</span>
                      )}
                      {msg.isDeleted && (
                        <span className="text-xs italic text-muted-foreground">(supprimé)</span>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap break-words mt-1">
                      {msg.content}
                      {msg.deletedReason && (
                        <span className="block text-xs text-muted-foreground mt-1">
                          Raison de suppression : {msg.deletedReason}
                        </span>
                      )}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
