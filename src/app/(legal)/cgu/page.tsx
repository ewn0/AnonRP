export const metadata = {
  title: "CGU - AnonRP",
};

export default function CguPage() {
  return (
    <>
      <h1 className="text-3xl font-bold mb-2">Conditions Générales d'Utilisation</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Dernière mise à jour : [DATE À COMPLÉTER]
      </p>

      <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/10 mb-8 text-sm">
        ⚠️ <strong>Ceci est un squelette générique.</strong> Avant la mise en ligne publique,
        fais relire ces CGU par un juriste. Les obligations légales varient selon le type de service,
        la monétisation, l'audience, etc.
      </div>

      <h2 className="text-xl font-bold mt-8 mb-3">1. Objet</h2>
      <p className="mb-4 text-muted-foreground leading-relaxed">
        AnonRP est une plateforme de roleplay anonyme qui permet à ses utilisateurs de créer
        des groupes thématiques, d'écrire des posts, d'échanger des messages et de participer
        à une économie virtuelle basée sur les AnonCoins. Les présentes CGU régissent l'utilisation
        de la plateforme.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-3">2. Accès au service</h2>
      <p className="mb-4 text-muted-foreground leading-relaxed">
        L'accès à AnonRP est réservé aux personnes physiques majeures (18 ans ou plus).
        L'inscription nécessite une adresse email valide et un nom d'utilisateur unique.
        Chaque utilisateur s'engage à fournir des informations exactes lors de l'inscription.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-3">3. Comportement attendu</h2>
      <p className="mb-4 text-muted-foreground leading-relaxed">
        Les utilisateurs s'interdisent notamment de publier des contenus illégaux,
        haineux, harcelants, sexuellement explicites impliquant des mineurs, ou portant
        atteinte à la vie privée d'autrui. Tout manquement peut entraîner un avertissement,
        un mute, un ban temporaire ou définitif.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-3">4. AnonCoins et achats</h2>
      <p className="mb-4 text-muted-foreground leading-relaxed">
        Les AnonCoins sont une monnaie virtuelle utilisable uniquement sur AnonRP. Ils peuvent être
        gagnés en participant ou achetés avec de l'argent réel. Les AnonCoins ne peuvent pas être
        échangés contre de l'argent, ni transférés entre comptes hors des mécaniques prévues
        (cadeaux). Conformément à l'article L.221-28 du Code de la consommation, le droit de
        rétractation ne s'applique pas aux biens numériques livrés immédiatement.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-3">5. Abonnements premium</h2>
      <p className="mb-4 text-muted-foreground leading-relaxed">
        Les pass Bronze, Argent et Or sont des abonnements mensuels renouvelables. Ils peuvent
        être annulés à tout moment depuis le panneau de gestion. L'annulation prend effet à la
        fin de la période en cours.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-3">6. Modération</h2>
      <p className="mb-4 text-muted-foreground leading-relaxed">
        L'équipe AnonRP se réserve le droit de modérer, modifier ou supprimer tout contenu
        contraire aux CGU, et de suspendre ou bannir tout compte concerné. Les signalements
        peuvent être faits via le bouton de signalement présent sur chaque contenu.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-3">7. Responsabilité</h2>
      <p className="mb-4 text-muted-foreground leading-relaxed">
        AnonRP héberge les contenus publiés par ses utilisateurs en qualité d'hébergeur au sens
        de la loi n°2004-575 du 21 juin 2004. Les utilisateurs sont seuls responsables des contenus
        qu'ils publient.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-3">8. Modifications des CGU</h2>
      <p className="mb-4 text-muted-foreground leading-relaxed">
        AnonRP peut modifier les présentes CGU à tout moment. Les utilisateurs seront informés
        par email et/ou via une notification sur la plateforme. L'utilisation continue du service
        après une modification vaut acceptation des nouvelles CGU.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-3">9. Droit applicable</h2>
      <p className="mb-4 text-muted-foreground leading-relaxed">
        Les présentes CGU sont soumises au droit français. Tout litige relève de la compétence
        des tribunaux français.
      </p>
    </>
  );
}
