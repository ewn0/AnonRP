import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { HeartbeatProvider } from "@/components/heartbeat-provider";
import { NotificationBell } from "@/components/notification-bell";
import { HeaderStats } from "@/components/header-stats";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      username: true,
      level: true,
      xp: true,
      coins: true,
      role: true,
      isInvisible: true,
    },
  });

  if (!user) redirect("/login");

  const canToggleInvisible = user.role === "ADMIN";

  return (
    <div className="min-h-screen flex flex-col">
      <HeartbeatProvider />

      <header className="border-b sticky top-0 z-10 bg-background">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-2">
          <Link href="/feed" className="text-2xl font-bold text-primary shrink-0">
            AnonRP
          </Link>

          <div className="flex items-center gap-1">
            <HeaderStats
              initialLevel={user.level}
              initialXp={user.xp.toString()}
              initialCoins={user.coins}
              username={user.username}
              initialInvisible={user.isInvisible}
              canToggleInvisible={canToggleInvisible}
            />
          </div>

          <nav className="flex items-center gap-1">
            <Link href="/feed" className="hidden md:block">
              <Button variant="ghost" size="sm">Feed</Button>
            </Link>
            <Link href="/groups">
              <Button variant="ghost" size="sm">Groupes</Button>
            </Link>
            <Link href="/messages" className="hidden md:block">
              <Button variant="ghost" size="sm">Messages</Button>
            </Link>

            <NotificationBell />

            <Link href={`/u/${user.username}`}>
              <Button variant="ghost" size="sm">Profil</Button>
            </Link>
            {user.role === "ADMIN" && (
              <Link href="/admin">
                <Button variant="ghost" size="sm" className="text-destructive">Admin</Button>
              </Link>
            )}
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <Button type="submit" variant="outline" size="sm">
                Déconnexion
              </Button>
            </form>
          </nav>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
