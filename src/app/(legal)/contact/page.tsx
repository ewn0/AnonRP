export const metadata = {
  title: "Contact - AnonRP",
};

export default function ContactPage() {
  return (
    <>
      <h1 className="text-3xl font-bold mb-8">Contact</h1>

      <p className="mb-6 text-muted-foreground leading-relaxed">
        Besoin d'aide, une question, un signalement ? Voici comment nous joindre.
      </p>

      <div className="grid gap-4">
        <div className="p-5 rounded-lg border border-border bg-card">
          <h2 className="font-bold mb-2">📧 Support général</h2>
          <p className="text-sm text-muted-foreground mb-2">
            Pour toute question sur le fonctionnement de la plateforme.
          </p>
          <p className="text-sm">
            <span className="text-primary">support@anonrp.[DOMAINE]</span>
          </p>
        </div>

        <div className="p-5 rounded-lg border border-border bg-card">
          <h2 className="font-bold mb-2">⚠️ Signalement de contenu</h2>
          <p className="text-sm text-muted-foreground mb-2">
            Pour signaler un contenu illégal ou en violation avec nos CGU.
          </p>
          <p className="text-sm">
            <span className="text-primary">signalement@anonrp.[DOMAINE]</span>
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Ou utilise directement le bouton de signalement sur la plateforme.
          </p>
        </div>

        <div className="p-5 rounded-lg border border-border bg-card">
          <h2 className="font-bold mb-2">🔒 Protection des données (RGPD)</h2>
          <p className="text-sm text-muted-foreground mb-2">
            Pour exercer tes droits (accès, rectification, suppression...).
          </p>
          <p className="text-sm">
            <span className="text-primary">rgpd@anonrp.[DOMAINE]</span>
          </p>
        </div>

        <div className="p-5 rounded-lg border border-border bg-card">
          <h2 className="font-bold mb-2">💬 Discord</h2>
          <p className="text-sm text-muted-foreground mb-2">
            Rejoins la communauté AnonRP sur Discord.
          </p>
          <p className="text-sm text-muted-foreground italic">
            [LIEN DISCORD À VENIR - Phase 5]
          </p>
        </div>
      </div>
    </>
  );
}
