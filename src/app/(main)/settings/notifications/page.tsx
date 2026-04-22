import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { NotificationPrefsForm } from "./notification-prefs-form";

export default async function SettingsNotificationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/settings/notifications");

  const prefs = await db.userNotificationPreferences.findUnique({
    where: { userId: session.user.id },
  });

  const initialPrefs = prefs ?? {
    emailOnMention: false,
    emailOnReply: false,
    emailOnGiftReceived: false,
    emailOnJoinRequestApproved: false,
    emailOnJoinRequestReceived: false,
    emailOnMessageDeleted: false,
    emailOnReportHandled: false,
    emailOnLevelUp: false,
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/settings" className="text-sm text-muted-foreground hover:text-foreground">
          ← Paramètres
        </Link>
      </div>

      <Card>
        <CardContent className="p-6">
          <h1 className="text-xl font-bold mb-1">Notifications</h1>
          <p className="text-sm text-muted-foreground mb-5">
            Choisis pour quels événements tu veux recevoir un email. Les notifications dans la cloche 🔔 sur le site restent toujours actives.
          </p>

          <NotificationPrefsForm initialPrefs={initialPrefs} />
        </CardContent>
      </Card>
    </div>
  );
}
