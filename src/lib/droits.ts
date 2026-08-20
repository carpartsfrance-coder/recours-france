/**
 * Ce que le consommateur peut exiger, selon sa situation.
 *
 * C'est le seul levier dont la plateforme dispose réellement aujourd'hui. La
 * promesse de visibilité suppose une fiche fréquentée : sur treize millions
 * d'entreprises, six en portent un signalement. Annoncer « votre problème sera
 * visible » à côté d'un compteur à zéro dessert la page.
 *
 * Le droit de la consommation, lui, s'applique quel que soit le volume. Un
 * délai de quatorze jours opposable à un vendeur vaut mieux qu'une audience
 * qui n'existe pas encore.
 *
 * Ces textes sont des informations générales, jamais une consultation
 * personnalisée : la formulation reste prudente là où l'application dépend du
 * contrat, et aucune échéance n'est affichée quand elle ne peut pas être
 * calculée.
 */

export type Droit = {
  /** Ce que le consommateur peut réclamer, en une phrase qu'il reconnaît. */
  exigence: string;
  /** Le délai opposable, quand il en existe un de portée générale. */
  delai: string | null;
  /** Le fondement, cité pour que la lettre porte. */
  fondement: string | null;
  /** Ce qui déclenche le délai — souvent mal compris, et décisif. */
  precision: string;
};

const PAR_SITUATION: Record<string, Droit> = {
  remboursement: {
    exigence: "Le remboursement intégral des sommes versées, frais de livraison compris.",
    delai: "14 jours",
    fondement: "article L221-24 du code de la consommation",
    precision:
      "Pour un achat à distance, le délai court à compter de la récupération du bien par le vendeur ou de la preuve de son expédition — c’est votre preuve de dépôt qui le déclenche, pas votre demande.",
  },
  retour: {
    exigence:
      "L’exercice de votre droit de rétractation, puis le remboursement intégral de votre commande.",
    delai: "14 jours pour se rétracter, 14 jours pour être remboursé",
    fondement: "articles L221-18 et L221-24 du code de la consommation",
    precision:
      "Le droit de rétractation s’exerce sans motif et sans pénalité pour la plupart des achats à distance. Certains biens en sont exclus — produits personnalisés, denrées périssables, contenus numériques déjà téléchargés.",
  },
  "commande-non-recue": {
    exigence:
      "La livraison effective de votre commande ou, à défaut, la résolution de la vente et le remboursement.",
    delai: "30 jours à défaut de date convenue",
    fondement: "articles L216-1 et L216-6 du code de la consommation",
    precision:
      "Le vendeur reste responsable de la livraison jusqu’à la remise du bien, même lorsqu’un transporteur intervient. Un colis annoncé livré mais jamais reçu se réclame au vendeur, pas au transporteur.",
  },
  livraison: {
    exigence:
      "La livraison conforme à ce qui était convenu, ou la résolution de la vente si le retard persiste.",
    delai: "30 jours à défaut de date convenue",
    fondement: "articles L216-1 et L216-6 du code de la consommation",
    precision:
      "Après une mise en demeure écrite restée sans effet dans un délai raisonnable, vous pouvez demander la résolution du contrat et le remboursement de toutes les sommes versées.",
  },
  "produit-defectueux": {
    exigence: "La réparation ou le remplacement du produit, à votre choix et sans frais.",
    delai: "2 ans à compter de la délivrance",
    fondement: "articles L217-3 et suivants du code de la consommation",
    precision:
      "La garantie légale de conformité est due par le vendeur, jamais par le fabricant. Pendant les vingt-quatre premiers mois pour un bien neuf, vous n’avez pas à prouver que le défaut existait à l’achat : c’est présumé.",
  },
  sav: {
    exigence: "La prise en charge de votre demande au titre de la garantie légale, sans frais.",
    delai: "2 ans à compter de la délivrance",
    fondement: "articles L217-3 et suivants du code de la consommation",
    precision:
      "Un refus de prise en charge doit être motivé. Conservez-le par écrit : c’est la pièce qui vous servira en médiation, et souvent celle qui débloque le dossier.",
  },
  paiement: {
    exigence: "Le remboursement des sommes prélevées à tort et l’arrêt des prélèvements.",
    delai: "13 mois pour contester un prélèvement",
    fondement: "article L133-24 du code monétaire et financier",
    precision:
      "Un prélèvement non autorisé se conteste aussi auprès de votre banque, qui doit le rembourser — dans les huit semaines pour un prélèvement autorisé dont le montant vous surprend.",
  },
  marketplace: {
    exigence:
      "L’identification du vendeur, puis l’exécution de ce qui était convenu ou le remboursement.",
    delai: null,
    fondement: "article L221-5 du code de la consommation",
    precision:
      "Sur une place de marché, votre cocontractant est le vendeur tiers, pas la plateforme. Celle-ci reste tenue de vous communiquer son identité, et propose en général une garantie contractuelle qui lui est propre.",
  },
  compte: {
    exigence: "L’accès à votre compte et à l’historique de vos commandes.",
    delai: "1 mois pour obtenir vos données",
    fondement: "article 15 du règlement général sur la protection des données",
    precision:
      "Indépendamment du litige commercial, vous pouvez exiger une copie des données vous concernant — commandes, échanges, factures. Le professionnel dispose d’un mois pour répondre.",
  },
  autre: {
    exigence: "Une réponse motivée à votre réclamation écrite.",
    delai: null,
    fondement: null,
    precision:
      "Tout professionnel doit indiquer le médiateur de la consommation dont il relève, et la saisine de ce médiateur est gratuite après une réclamation écrite restée sans réponse satisfaisante.",
  },
};

export function droitPour(situation: string | null | undefined): Droit {
  return (situation && PAR_SITUATION[situation]) || PAR_SITUATION.autre;
}

/** Les trois leviers présentés à l'accueil, avant tout choix de situation. */
export const LEVIERS = [
  {
    titre: "Une lettre de réclamation qui cite les textes",
    desc: "Rédigée à partir de votre situation, avec le fondement et le délai applicables. C’est la pièce qui fait courir les délais et sans laquelle aucun recours ne s’ouvre.",
  },
  {
    titre: "Les délais que le professionnel doit tenir",
    desc: "Quatorze jours pour rembourser un achat à distance, trente pour livrer, deux ans de garantie légale. Savoir lequel s’applique change une demande en exigence.",
  },
  {
    titre: "Le médiateur, gratuit, puis les recours",
    desc: "La médiation de la consommation ne vous coûte rien et s’ouvre dès qu’une réclamation écrite est restée sans réponse satisfaisante.",
  },
] as const;
