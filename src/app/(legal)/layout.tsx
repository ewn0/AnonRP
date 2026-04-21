import Link from "next/link";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
            AnonRP
          </Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Retour à l'accueil
          </Link>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-12 max-w-3xl">
        <div className="prose prose-invert max-w-none">
          {children}
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
