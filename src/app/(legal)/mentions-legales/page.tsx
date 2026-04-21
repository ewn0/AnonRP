export const metadata = {
  title: "Mentions légales - AnonRP",
};

export default function MentionsLegalesPage() {
  return (
    <>
      <h1 className="text-3xl font-bold mb-8">Mentions légales</h1>

      <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/10 mb-8 text-sm">
        ⚠️ <strong>À compléter obligatoirement avant mise en ligne publique.</strong> Les mentions
        légales sont obligatoires en France pour tout site édité à titre professionnel
        (LCEN, art. 6 III).
      </div>

      <h2 className="text-xl font-bold mt-8 mb-3">Éditeur du site</h2>
      <p className="mb-4 text-muted-foreground leading-relaxed">
        Le site AnonRP est édité par :<br />
        [NOM / RAISON SOCIALE]<br />
        [FORME JURIDIQUE, ex: SAS, SARL, micro-entreprise]<br />
        [ADRESSE DU SIÈGE SOCIAL]<br />
        [SIRET / SIREN si applicable]<br />
        [NUMÉRO DE TVA si applicable]<br />
        Email : [EMAIL DE CONTACT]
      </p>

      <h2 className="text-xl font-bold mt-8 mb-3">Directeur de la publication</h2>
      <p className="mb-4 text-muted-foreground leading-relaxed">
        [NOM PRÉNOM DU DIRECTEUR DE LA PUBLICATION]
      </p>

      <h2 className="text-xl font-bold mt-8 mb-3">Hébergeur</h2>
      <p className="mb-4 text-muted-foreground leading-relaxed">
        Vercel Inc.<br />
        340 S Lemon Ave #4133<br />
        Walnut, CA 91789, USA<br />
        <br />
        Base de données : Neon Inc. - https://neon.tech
      </p>

      <h2 className="text-xl font-bold mt-8 mb-3">Propriété intellectuelle</h2>
      <p className="mb-4 text-muted-foreground leading-relaxed">
        L'ensemble du site (design, code, marque, logo) est protégé par le droit d'auteur et
        le droit des marques. Les contenus publiés par les utilisateurs restent leur propriété.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-3">Signalement de contenu illicite</h2>
      <p className="mb-4 text-muted-foreground leading-relaxed">
        Conformément à l'article 6 de la LCEN, tout contenu manifestement illicite peut être
        signalé à l'adresse [EMAIL DE SIGNALEMENT] ou via le bouton de signalement présent
        sur la plateforme.
      </p>
    </>
  );
}
