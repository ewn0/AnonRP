export const metadata = {
  title: "Politique de confidentialité - AnonRP",
};

export default function ConfidentialitePage() {
  return (
    <>
      <h1 className="text-3xl font-bold mb-2">Politique de confidentialité</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Dernière mise à jour : [DATE À COMPLÉTER]
      </p>

      <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/10 mb-8 text-sm">
        ⚠️ <strong>Squelette RGPD à personnaliser.</strong> Complète les sections avec les coordonnées
        de ton responsable de traitement (toi/ta société) et fais relire par un juriste avant prod.
      </div>

      <h2 className="text-xl font-bold mt-8 mb-3">1. Responsable du traitement</h2>
      <p className="mb-4 text-muted-foreground leading-relaxed">
        Le responsable du traitement des données personnelles collectées sur AnonRP est :
        [NOM / RAISON SOCIALE], [ADRESSE], [EMAIL DE CONTACT].
      </p>

      <h2 className="text-xl font-bold mt-8 mb-3">2. Données collectées</h2>
      <p className="mb-4 text-muted-foreground leading-relaxed">
        Lors de l'inscription : adresse email, nom d'utilisateur, mot de passe (stocké sous forme
        hachée, jamais en clair). Lors de l'utilisation : contenus publiés, messages privés,
        adresse IP, données de connexion (logs techniques pour la sécurité). Lors d'un achat :
        données de facturation nécessaires (pays, adresse) transmises à notre prestataire de
        paiement Stripe.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-3">3. Finalités du traitement</h2>
      <p className="mb-4 text-muted-foreground leading-relaxed">
        Les données sont traitées pour : fournir le service (authentification, affichage de contenus),
        assurer la sécurité (prévention de la fraude, modération), traiter les paiements, respecter
        les obligations légales (facturation, conservation de logs).
      </p>

      <h2 className="text-xl font-bold mt-8 mb-3">4. Base légale</h2>
      <p className="mb-4 text-muted-foreground leading-relaxed">
        L'exécution du contrat qui vous lie à AnonRP (articles 6.1.b du RGPD), le respect d'obligations
        légales (article 6.1.c), et notre intérêt légitime à sécuriser la plateforme (article 6.1.f).
      </p>

      <h2 className="text-xl font-bold mt-8 mb-3">5. Durée de conservation</h2>
      <p className="mb-4 text-muted-foreground leading-relaxed">
        Les données de compte sont conservées tant que le compte est actif. En cas de suppression
        de compte, les données sont supprimées sous 30 jours, à l'exception de celles que nous
        sommes légalement tenus de conserver (données de facturation : 10 ans ; logs de connexion :
        12 mois).
      </p>

      <h2 className="text-xl font-bold mt-8 mb-3">6. Destinataires</h2>
      <p className="mb-4 text-muted-foreground leading-relaxed">
        Les données ne sont pas vendues. Elles peuvent être transmises à nos sous-traitants techniques
        (hébergeur, prestataire d'email, Stripe pour les paiements), tous soumis à des obligations
        de confidentialité et de sécurité conformes au RGPD.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-3">7. Vos droits</h2>
      <p className="mb-4 text-muted-foreground leading-relaxed">
        Conformément au RGPD, vous disposez des droits suivants : accès, rectification, effacement,
        limitation, portabilité, opposition. Pour exercer ces droits, contactez-nous à
        [EMAIL DE CONTACT]. Vous pouvez également déposer une réclamation auprès de la CNIL
        (www.cnil.fr).
      </p>

      <h2 className="text-xl font-bold mt-8 mb-3">8. Cookies</h2>
      <p className="mb-4 text-muted-foreground leading-relaxed">
        AnonRP utilise des cookies strictement nécessaires au fonctionnement du service
        (authentification, sécurité). Aucun cookie publicitaire ni de suivi tiers n'est déposé
        sans votre consentement.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-3">9. Sécurité</h2>
      <p className="mb-4 text-muted-foreground leading-relaxed">
        Nous mettons en œuvre des mesures techniques et organisationnelles pour protéger vos
        données : chiffrement des mots de passe, connexions HTTPS, accès restreint aux données
        par le personnel.
      </p>
    </>
  );
}
