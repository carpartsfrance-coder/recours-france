/**
 * Contenu éditorial de la refonte d'août 2026.
 *
 * La copie française du handoff est validée et reprise au mot près. Elle est
 * seulement paramétrée par le nom de l'entreprise : les prototypes parlent de
 * JK AUTO, la page en sert treize millions.
 *
 * ── L'incohérence de modération, tranchée ──────────────────────────────────
 * Le handoff signale lui-même sa contradiction : la fiche annonçait « après
 * modération », le tunnel une publication immédiate. Le choix retenu est la
 * publication immédiate assortie d'une modération réactive — retrait sur
 * signalement ou sur contestation, jamais d'examen préalable.
 *
 * Ce n'est pas un compromis mais le seul régime tenable. Un examen préalable
 * ferait de Recours France l'éditeur de chaque déclaration, donc responsable
 * de son contenu ; en s'abstenant de trier avant publication et en retirant
 * promptement ce qui lui est signalé, la plateforme reste hébergeur au sens de
 * l'article 6 de la loi pour la confiance dans l'économie numérique. C'est le
 * régime des plateformes d'avis, et c'est celui que décrit déjà la charte de
 * modération du site.
 *
 * Les mentions « après modération » sont donc retirées partout.
 */

export type Motif = {
  cle: string;
  libelle: string;
  desc: string;
  icone: "remboursement" | "colis" | "bulle" | "alerte" | "carte" | "question";
};

/**
 * Les six portes d'entrée de la fiche.
 *
 * Aucun délai légal n'est affiché ici — ni « 14 jours », ni « 2 ans ». Hors
 * contexte le chiffre est ambigu : il dépend du fondement invoqué, et un
 * consommateur qui lit « 14 jours » sur une carte de SAV en conclut qu'il est
 * hors délai alors qu'il ne l'est pas. Le délai apparaît une fois la situation
 * précisée, dans le plan d'action.
 */
export const MOTIFS_FICHE: Motif[] = [
  {
    cle: "REMBOURSEMENT",
    libelle: "Remboursement non reçu",
    desc: "Rétractation, retour ou annulation : la somme n’a pas été recréditée.",
    icone: "remboursement",
  },
  {
    cle: "LIVRAISON",
    libelle: "Commande non reçue",
    desc: "Colis jamais livré, livraison annoncée mais absente, retard important.",
    icone: "colis",
  },
  {
    cle: "SAV",
    libelle: "SAV ou service après-vente",
    desc: "Aucune réponse, prise en charge refusée ou intervention sans suite.",
    icone: "bulle",
  },
  {
    cle: "GARANTIE",
    libelle: "Produit défectueux ou garantie",
    desc: "Panne, défaut de conformité ou refus d’appliquer la garantie légale.",
    icone: "alerte",
  },
  {
    cle: "RESILIATION",
    libelle: "Résiliation ou prélèvement",
    desc: "Résiliation non prise en compte ou prélèvement que vous contestez.",
    icone: "carte",
  },
  {
    cle: "AUTRE",
    libelle: "Autre problème",
    desc: "Votre situation ne correspond à aucune de ces catégories.",
    icone: "question",
  },
];

export const BENEFICES = (nom: string) => [
  {
    icone: "oeil" as const,
    titre: "Votre litige visible publiquement",
    desc: `Consultable sur la fiche de ${nom}, par les consommateurs recherchant cette entreprise.`,
  },
  {
    icone: "document" as const,
    titre: "Une réclamation prête à envoyer",
    desc: "Rédigée selon votre situation. Vous la relisez et restez l’expéditeur.",
  },
  {
    icone: "horloge" as const,
    titre: "Les prochaines étapes et échéances",
    desc: "Les démarches sont présentées dans l’ordre selon votre situation.",
  },
];

export type EtapePlan = {
  cle: string;
  titre: string;
  sous: string;
  paragraphes: string[];
  points?: string[];
};

/** Les cinq étapes du plan d'action, dans l'ordre du droit de la consommation. */
export function etapesPlan(nom: string, mediateur: string | null): EtapePlan[] {
  return [
    {
      cle: "s1",
      titre: "Envoyer une première demande écrite",
      sous: "Contactez le service client par e-mail, formulaire ou espace client et conservez une copie.",
      paragraphes: [
        "La réclamation commence par un écrit adressé au service client, en rappelant le numéro de commande et la date des faits. Conservez une copie de chaque échange : c’est cette trace écrite qui conditionne la suite des démarches, notamment la saisine du médiateur.",
      ],
      points: [
        "Numéro de commande, date d’achat et montant concerné",
        "Description factuelle du problème, sans appréciation personnelle",
        "Demande précise : remboursement, remplacement, réparation, résiliation",
        "Délai de réponse souhaité, généralement quinze jours",
      ],
    },
    {
      cle: "s2",
      titre: "Envoyer une réclamation formelle",
      sous: "Adressez une réclamation structurée avec les faits, votre demande et un délai de réponse.",
      paragraphes: [
        "Si le service client ne répond pas dans un délai raisonnable, adressez une réclamation écrite au siège. Ce courrier fait courir les délais utiles et constitue la pièce centrale de votre dossier.",
        "Recours France prépare le texte de cette réclamation à partir de votre situation. L’envoi et le suivi restent effectués par vos soins : la plateforme ne transmet rien à l’entreprise.",
      ],
    },
    {
      cle: "s3",
      titre: "Envoyer une mise en demeure si nécessaire",
      sous: "Lettre recommandée avec avis de réception, en l’absence de réponse.",
      paragraphes: [
        "La mise en demeure rappelle le fondement légal invoqué, le montant réclamé et le délai laissé à l’entreprise pour y répondre. Envoyée en recommandé avec avis de réception, elle est conservée avec la preuve de dépôt.",
      ],
    },
    {
      cle: "s4",
      titre: "Saisir le médiateur",
      sous: "Gratuit, après une réclamation écrite restée sans réponse satisfaisante.",
      paragraphes: [
        "La médiation de la consommation est gratuite pour le consommateur et suppose une réclamation écrite préalable restée sans réponse satisfaisante. Le médiateur compétent est celui dont le professionnel a déclaré relever.",
        mediateur
          ? `${nom} a déclaré relever de ${mediateur}. Sa saisine suppose une réclamation écrite préalable restée sans réponse satisfaisante.`
          : `Aucune adhésion à un médiateur n’est déclarée par ${nom} à ce jour. Tout professionnel est pourtant tenu de proposer un dispositif de médiation : demandez-lui par écrit de quel médiateur il relève.`,
      ],
    },
    {
      cle: "s5",
      titre: "Utiliser SignalConso ou un autre recours adapté",
      sous: "Signalement à l’administration, ou recours judiciaire selon le montant.",
      paragraphes: [
        "SignalConso est le service public de signalement des anomalies constatées chez un professionnel : pratique commerciale trompeuse, produit dangereux, information précontractuelle manquante. La démarche est distincte d’un signalement publié sur Recours France et peut être menée en parallèle.",
        "Selon le montant en jeu et la nature du litige, une saisine du juge peut être envisagée. Ces informations sont générales et ne constituent pas un conseil juridique personnalisé.",
      ],
    },
  ];
}

/** Les trois réponses à « Où en êtes-vous dans vos démarches ? ». */
export const SITUATIONS_PLAN = [
  {
    cle: "pas-encore",
    libelle: "Non, pas encore",
    action: "Préparer ma première réclamation",
    note: "Commencez par l’étape 1 : une demande écrite au service client, dont vous conservez une copie.",
  },
  {
    cle: "sans-reponse",
    libelle: "Oui, mais sans réponse satisfaisante",
    action: "Préparer une mise en demeure",
    note: "Passez à l’étape 3 : la mise en demeure rappelle le fondement légal, le montant réclamé et le délai laissé à l’entreprise.",
  },
  {
    cle: "refus",
    libelle: "Oui, ma réclamation a été refusée",
    action: "Vérifier le médiateur et les recours possibles",
    note: "Passez à l’étape 4 : conservez le refus écrit et sa motivation, ils seront utiles en médiation.",
  },
] as const;

/**
 * La foire aux questions.
 *
 * Deux entrées s'écartent du prototype, qui annonçait une publication « après
 * modération » que le tunnel contredisait. Voir l'en-tête de ce fichier.
 */
export function faqRefonte(nom: string) {
  return [
    {
      // La première question est celle que le chercheur a tapée — « avis X »
      // est la requête d'entrée de ces fiches. La réponse ne prétend jamais
      // que des avis notés existent : elle dit ce que la fiche porte vraiment,
      // et en quoi c'est différent. Servir l'intention sans trahir le produit.
      cle: "f0",
      q: `Peut-on lire des avis sur ${nom} ?`,
      r: [
        `Recours France ne publie pas d’avis notés — aucune étoile, aucune note moyenne. Ce que vous lisez sur cette fiche sont des signalements : des expériences déclarées par des consommateurs, datées, avec la solution demandée et l’état du litige.`,
        `C’est une matière plus étroite qu’un avis, mais plus vérifiable dans sa forme : chaque signalement peut être contesté par ${nom}, et son auteur peut déclarer ultérieurement le litige résolu. Rien n’est généré ni recopié d’ailleurs pour étoffer la fiche.`,
      ],
    },
    {
      cle: "f1",
      q: "Combien coûte la publication d’un signalement ?",
      r: [
        "La publication est gratuite et prend moins de deux minutes : la catégorie du problème, une date approximative, ce qui s’est passé et la solution que vous souhaitez. Votre signalement est visible immédiatement, et vous pourrez ensuite indiquer si votre problème a été résolu.",
      ],
    },
    {
      cle: "f2",
      q: `Recours France transmet-il ma réclamation à ${nom} ?`,
      r: [
        "Non. La plateforme ne transmet pas les réclamations aux professionnels et n’intervient pas dans le règlement des litiges. Vous restez l’expéditeur de votre réclamation ; Recours France en prépare le texte et rend votre situation visible publiquement.",
      ],
    },
    {
      cle: "f3",
      q: "Des justificatifs sont-ils obligatoires ?",
      r: [
        "Non, ils sont facultatifs et ne sont jamais publiés. Facture, preuve de dépôt du colis, échanges avec le service client : ils renforcent votre dossier et permettent d’afficher un niveau de vérification plus élevé, mais leur absence n’empêche pas la publication.",
      ],
    },
    {
      cle: "f4",
      q: "Comment un signalement est-il modéré ou retiré ?",
      r: [
        "Il n’y a pas d’examen préalable : votre signalement paraît dès sa validation. Les propos injurieux, les accusations pénales et les données personnelles de tiers sont retirés dès qu’ils sont signalés. Une entreprise peut contester une déclaration la concernant : la contestation est examinée sur pièces, quelle que soit la partie qui le demande.",
      ],
    },
    {
      cle: "f5",
      q: "Comment fonctionne Recours France ?",
      r: [
        "Le consommateur décrit son problème : catégorie, date approximative, faits et solution souhaitée. Seules la catégorie, la date, la solution demandée et le statut sont publiés — la description des faits reste confidentielle et sert à rédiger les courriers. L’entreprise peut contester, et le consommateur indique lui-même si sa situation a été résolue : Recours France ne le constate pas à sa place.",
      ],
    },
  ];
}
