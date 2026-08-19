/**
 * Guide des démarches gratuites, dans le bon ordre.
 *
 * Périmètre strict : Recours France produit une INFORMATION GÉNÉRALE et des
 * parcours prédéfinis. La plateforme n'envoie rien, ne transmet rien au
 * professionnel et ne délivre pas de conseil juridique personnalisé.
 * Chaque étape reste à l'initiative du consommateur.
 */

export type Categorie = "REMBOURSEMENT" | "LIVRAISON" | "GARANTIE" | "SAV" | "RESILIATION" | "AUTRE";
export type ContactPrealable = "ECRIT" | "TELEPHONE" | "AUCUN";

export type Etape = {
  numero: number;
  titre: string;
  delai: string;
  description: string;
  /** « disponible » : à faire maintenant. « conditionnee » : dépend d'une étape antérieure. */
  etat: "faite" | "disponible" | "conditionnee" | "dernier-recours";
  echeance?: Date;
  reference?: string;
};

export type Preuve = { intitule: string; utilite: string; prioritaire: boolean };

export type Guide = {
  categorie: Categorie;
  intitule: string;
  fondement: string;
  etapes: Etape[];
  preuves: Preuve[];
  delaisUtiles: { libelle: string; valeur: string }[];
  demarchesOfficielles: { nom: string; description: string; url: string }[];
};

const JOUR = 86_400_000;

const PREUVES_COMMUNES: Preuve[] = [
  {
    intitule: "Facture, bon de commande ou confirmation de paiement",
    utilite: "Établit la relation commerciale, la date et le montant. C’est la pièce qui permet de vérifier votre signalement.",
    prioritaire: true,
  },
  {
    intitule: "Échanges écrits avec le service client",
    utilite: "Prouve vos démarches et leurs dates. Les échanges téléphoniques ne se prouvent pas.",
    prioritaire: true,
  },
  {
    intitule: "Preuve d’envoi de la réclamation écrite",
    utilite: "Accusé de réception ou courriel horodaté : condition de recevabilité devant le médiateur.",
    prioritaire: true,
  },
  {
    intitule: "Relevé bancaire ou preuve de prélèvement",
    utilite: "Utile si le professionnel affirme avoir remboursé ou cessé les prélèvements.",
    prioritaire: false,
  },
];

const PREUVES_PAR_CATEGORIE: Record<Categorie, Preuve[]> = {
  REMBOURSEMENT: [
    {
      intitule: "Preuve de rétractation ou d’annulation",
      utilite: "Formulaire, courriel ou capture d’écran daté, dans le délai de quatorze jours.",
      prioritaire: true,
    },
    {
      intitule: "Preuve de retour du produit",
      utilite: "Bordereau du transporteur ou accusé de réception du colis.",
      prioritaire: true,
    },
  ],
  LIVRAISON: [
    {
      intitule: "Date de livraison annoncée",
      utilite: "Capture de la fiche produit ou de la confirmation de commande.",
      prioritaire: true,
    },
    {
      intitule: "Suivi du colis ou réserves émises à la livraison",
      utilite: "Démontre le retard, l’absence de remise ou l’état du colis.",
      prioritaire: true,
    },
  ],
  GARANTIE: [
    {
      intitule: "Photographies du produit et du défaut",
      utilite: "Documente la panne ou le défaut de conformité.",
      prioritaire: true,
    },
    {
      intitule: "Rapport d’atelier ou devis de réparation",
      utilite: "Élément technique opposable en cas de refus de prise en charge.",
      prioritaire: false,
    },
  ],
  SAV: [
    {
      intitule: "Numéro de dossier SAV et dates de dépôt",
      utilite: "Retrace la prise en charge et ses délais.",
      prioritaire: true,
    },
    {
      intitule: "Bon de dépôt ou d’enlèvement",
      utilite: "Prouve la remise du produit au professionnel.",
      prioritaire: false,
    },
  ],
  RESILIATION: [
    {
      intitule: "Demande de résiliation et sa date d’envoi",
      utilite: "Fait courir le délai de résiliation opposable au professionnel.",
      prioritaire: true,
    },
    {
      intitule: "Contrat et conditions générales applicables",
      utilite: "Détermine le préavis, les frais et les modalités prévus.",
      prioritaire: true,
    },
  ],
  AUTRE: [
    {
      intitule: "Captures d’écran de l’offre ou de l’information contestée",
      utilite: "Fige l’information telle qu’elle vous a été présentée.",
      prioritaire: true,
    },
  ],
};

const FONDEMENTS: Record<Categorie, string> = {
  REMBOURSEMENT:
    "Droit de rétractation de quatorze jours pour un achat à distance, remboursement sous quatorze jours après récupération du bien (code de la consommation, art. L221-18 et suivants).",
  LIVRAISON:
    "Le professionnel doit livrer à la date annoncée ou, à défaut, dans les trente jours. Passé ce délai, une mise en demeure de livrer ouvre la résolution du contrat (art. L216-1 et suivants).",
  GARANTIE:
    "Garantie légale de conformité de deux ans sur un bien neuf, sans preuve à votre charge pendant vingt-quatre mois. La garantie des vices cachés reste ouverte deux ans après la découverte du défaut.",
  SAV: "Un service après-vente contractuel s’exécute selon les délais annoncés ; à défaut, dans un délai raisonnable. La garantie légale reste due en parallèle de toute garantie commerciale.",
  RESILIATION:
    "Résiliation possible à tout moment après un an pour de nombreux contrats à tacite reconduction, et sous trois mois pour un contrat d’assurance. Les prélèvements doivent cesser à la date de résiliation.",
  AUTRE:
    "Obligation générale d’information loyale du consommateur et interdiction des pratiques commerciales trompeuses (art. L121-1 et suivants).",
};

const DEMARCHES_OFFICIELLES = [
  {
    nom: "SignalConso (DGCCRF)",
    description:
      "Pour une pratique commerciale trompeuse, un produit dangereux, un affichage de prix incorrect ou une fraude. La démarche est indépendante de votre signalement Recours France.",
    url: "https://signal.conso.gouv.fr",
  },
  {
    nom: "Centre européen des consommateurs France",
    description: "Pour un litige avec un professionnel établi dans un autre pays de l’Union européenne.",
    url: "https://www.europe-consommateurs.eu",
  },
  {
    nom: "Plateforme de règlement en ligne des litiges",
    description: "Pour un achat en ligne transfrontalier au sein de l’Union européenne.",
    url: "https://www.economie.gouv.fr/mediation-conso",
  },
];

/**
 * Construit le guide personnalisé d'un signalement.
 * Les échéances sont calculées à partir de la date de dépôt et de l'existence
 * d'une réclamation écrite préalable.
 */
export function construireGuide(params: {
  categorie: Categorie;
  contactPrealable: ContactPrealable;
  dateSignalement: Date;
  reference: string;
  verifie: boolean;
  mediateur?: { nom: string; delaiInstruction: string | null; siteWeb: string | null } | null;
}): Guide {
  const { categorie, contactPrealable, dateSignalement, mediateur } = params;
  const ecritDejaFait = contactPrealable === "ECRIT";

  // La médiation n'est recevable que deux mois après une réclamation écrite.
  const departMediation = new Date(dateSignalement.getTime() + (ecritDejaFait ? 0 : 7 * JOUR));
  const ouvertureMediation = new Date(departMediation.getTime() + 60 * JOUR);
  const finDelaiReponse = new Date(dateSignalement.getTime() + 30 * JOUR);

  const etapes: Etape[] = [
    {
      numero: 1,
      titre: "Réclamation écrite au professionnel",
      delai: ecritDejaFait ? "déjà effectuée" : "à faire maintenant",
      description: ecritDejaFait
        ? "Vous déclarez avoir déjà écrit au professionnel. Conservez la preuve d’envoi : elle conditionne la saisine du médiateur."
        : "Écrivez au service consommateurs : faits, dates, demande chiffrée, références de commande et de dossier. Un courriel horodaté suffit ; un recommandé sécurise la preuve.",
      etat: ecritDejaFait ? "faite" : "disponible",
    },
    {
      numero: 2,
      titre: "Signalement sur Recours France",
      delai: "effectué",
      description: params.verifie
        ? `Votre signalement ${params.reference} est enregistré, avec un justificatif horodaté et scellé.`
        : `Votre signalement ${params.reference} est enregistré. Ajoutez un justificatif pour l’appuyer.`,
      etat: "faite",
      reference: params.reference,
    },
    {
      numero: 3,
      titre: "Relance et suivi de la réponse",
      delai: "30 jours",
      description:
        "Sans réponse satisfaisante, relancez une fois par écrit en rappelant votre première demande et sa date. Enregistrez chaque réponse reçue dans votre espace : le statut du signalement se met à jour.",
      etat: "disponible",
      echeance: finDelaiReponse,
    },
    {
      numero: 4,
      titre: "Médiation de la consommation",
      delai: mediateur?.delaiInstruction ?? "90 jours d’instruction",
      description: mediateur
        ? `${mediateur.nom} est le médiateur identifié pour ce secteur. La saisine est gratuite et reste à votre initiative. Elle n’est recevable que deux mois après une réclamation écrite restée sans réponse satisfaisante.`
        : "La saisine du médiateur compétent est gratuite. Elle n’est recevable que deux mois après une réclamation écrite restée sans réponse satisfaisante. Le médiateur applicable figure dans les conditions générales du professionnel.",
      etat: "conditionnee",
      echeance: ouvertureMediation,
    },
    {
      numero: 5,
      titre: "Voie judiciaire",
      delai: "prescription de 5 ans",
      description:
        "En dernier recours, le tribunal judiciaire est compétent pour un litige de consommation. En dessous de 5 000 €, la procédure simplifiée peut être engagée sans avocat. Votre dossier et vos pièces sont réutilisables en l’état.",
      etat: "dernier-recours",
    },
  ];

  const preuves = [...PREUVES_PAR_CATEGORIE[categorie], ...PREUVES_COMMUNES];

  const delaisUtiles = [
    { libelle: "Réponse attendue du professionnel", valeur: "30 jours après la réclamation écrite" },
    { libelle: "Ouverture de la médiation", valeur: `à partir du ${formatCourt(ouvertureMediation)}` },
    { libelle: "Instruction du médiateur", valeur: mediateur?.delaiInstruction ?? "90 jours" },
    { libelle: "Prescription de l’action", valeur: "5 ans à compter des faits" },
  ];

  if (categorie === "REMBOURSEMENT") {
    delaisUtiles.unshift({ libelle: "Remboursement après rétractation", valeur: "14 jours" });
  }
  if (categorie === "LIVRAISON") {
    delaisUtiles.unshift({ libelle: "Délai de livraison légal maximal", valeur: "30 jours" });
  }
  if (categorie === "GARANTIE") {
    delaisUtiles.unshift({ libelle: "Garantie légale de conformité", valeur: "2 ans, bien neuf" });
  }

  return {
    categorie,
    intitule: INTITULES[categorie],
    fondement: FONDEMENTS[categorie],
    etapes,
    preuves,
    delaisUtiles,
    demarchesOfficielles: DEMARCHES_OFFICIELLES,
  };
}

const INTITULES: Record<Categorie, string> = {
  REMBOURSEMENT: "Remboursement non obtenu",
  LIVRAISON: "Problème de livraison",
  GARANTIE: "Garantie légale non appliquée",
  SAV: "Service après-vente défaillant",
  RESILIATION: "Résiliation ou abonnement contesté",
  AUTRE: "Litige de consommation",
};

/**
 * Modèle de lettre de relance, prérempli avec les références du dossier.
 * Le consommateur l'envoie lui-même : Recours France ne transmet rien.
 */
export function modeleRelance(params: {
  reference: string;
  entreprise: string;
  adresseEntreprise?: string | null;
  categorie: Categorie;
  montant?: string | null;
  dateFaits: Date;
  prenom: string;
  nom: string;
}): string {
  const objet = INTITULES[params.categorie];
  const demande =
    params.categorie === "REMBOURSEMENT"
      ? `le remboursement de la somme de ${params.montant ?? "…"}`
      : params.categorie === "LIVRAISON"
        ? "la livraison effective de ma commande ou, à défaut, la résolution du contrat et le remboursement intégral"
        : params.categorie === "GARANTIE"
          ? "la mise en œuvre de la garantie légale de conformité, par réparation ou remplacement sans frais"
          : params.categorie === "SAV"
            ? "la prise en charge effective de mon dossier et sa réparation dans un délai raisonnable"
            : params.categorie === "RESILIATION"
              ? "la résiliation effective de mon contrat et l’arrêt de tout prélèvement"
              : "une réponse écrite et une solution à la situation décrite";

  return `${params.prenom} ${params.nom}
[Votre adresse]

${params.entreprise}
Service consommateurs
${params.adresseEntreprise ?? "[Adresse du service consommateurs]"}

Objet : ${objet} — réclamation, dossier ${params.reference}
Lettre recommandée avec accusé de réception

Madame, Monsieur,

Je vous ai contactés au sujet des faits survenus le ${formatLong(params.dateFaits)}, sans obtenir de solution à ce jour.

[Rappelez ici en trois phrases : la commande ou le contrat concerné, ce qui s’est passé, ce que vous avez déjà demandé et à quelle date.]

En conséquence, je vous demande ${demande}, dans un délai de trente jours à compter de la réception de la présente.

À défaut de réponse satisfaisante dans ce délai, je saisirai le médiateur de la consommation compétent, dont les coordonnées figurent dans vos conditions générales, puis, le cas échéant, la juridiction compétente.

Vous trouverez ci-joint les justificatifs utiles. Je vous remercie de bien vouloir accuser réception de ce courrier.

Veuillez agréer, Madame, Monsieur, l’expression de mes salutations distinguées.

${params.prenom} ${params.nom}

Pièces jointes : [facture ou bon de commande], [échanges antérieurs], [preuve de retour ou d’envoi le cas échéant]

—
Référence de suivi personnelle : ${params.reference}
Ce modèle est une information générale fournie par Recours France. Il ne constitue pas une consultation juridique et doit être adapté à votre situation. Recours France n’adresse aucun courrier à votre place.`;
}

function formatCourt(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

const MOIS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

function formatLong(d: Date): string {
  // « 1 juillet » ne s'écrit pas : le premier du mois est un ordinal.
  const jour = d.getDate() === 1 ? "1er" : String(d.getDate());
  return `${jour} ${MOIS[d.getMonth()]} ${d.getFullYear()}`;
}
