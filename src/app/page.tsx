import Link from "next/link";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const session = await auth();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
            AnonRP
          </Link>
          <nav className="flex items-center gap-3">
            {session?.user ? (
              <>
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  Salut, <span className="text-foreground">{session.user.username}</span>
                </span>
                <Link href="/feed">
                  <Button>Accéder au forum</Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost">Connexion</Button>
                </Link>
                <Link href="/register">
                  <Button>Inscription</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-3xl text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-xs text-primary">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Plateforme en bêta
          </div>

          <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight">
            Le roleplay,
            <br />
            <span className="bg-gradient-to-r from-primary via-purple-400 to-primary bg-clip-text text-transparent">
              complètement anonyme.
            </span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Rejoins des groupes thématiques, incarne qui tu veux, monte en niveau,
            offre des cadeaux. Une communauté, des univers infinis.
          </p>

          {!session?.user && (
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Link href="/register">
                <Button size="lg" className="w-full sm:w-auto shadow-lg shadow-primary/30">
                  Créer un compte gratuit
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  J'ai déjà un compte
                </Button>
              </Link>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-12 max-w-2xl mx-auto">
            <Feature icon="🎭" title="100% Anonyme" description="Aucune info perso demandée" />
            <Feature icon="💎" title="Économie virtuelle" description="Gagne des AnonCoins en participant" />
            <Feature icon="⚡" title="Progression" description="Monte en niveau, débloque des perks" />
          </div>

          <p className="text-xs text-muted-foreground pt-8">
            Réservé aux personnes majeures. En créant un compte tu acceptes nos CGU.
          </p>
        </div>
      </main>

      <footer className="border-t border-border/50 py-6 text-center text-sm text-muted-foreground">
        <div className="container mx-auto px-4 flex flex-wrap justify-center gap-4">
          <Link href="/cgu" className="hover:text-foreground transition-colors">CGU</Link>
          <Link href="/confidentialite" className="hover:text-foreground transition-colors">Confidentialité</Link>
          <Link href="/mentions-legales" className="hover:text-foreground transition-colors">Mentions légales</Link>
          <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
        </div>
      </footer>
    </div>
  );
}

function Feature({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="p-4 rounded-lg border border-border/50 bg-card/50 backdrop-blur-sm">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-sm font-semibold">{title}</div>
      <div className="text-xs text-muted-foreground mt-1">{description}</div>
    </div>
  );
}
