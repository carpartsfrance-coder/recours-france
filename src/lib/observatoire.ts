/**
 * Contenu éditorial de la fiche entreprise.
 *
 * Ces textes viennent du handoff « fiche entreprise SEO-first » et sont repris
 * verbatim : le copy y est validé, avertissements et mentions de portée
 * compris. Seul le nom de l'entreprise est interpolé.
 *
 * C'est ce contenu qui donne sa substance à une fiche. Sans lui, une page se
 * résumait à une raison sociale, un numéro et une adresse — une trentaine de
 * mots réellement propres à l'entreprise, noyés dans un habillage identique
 * sur des millions de pages. Les démarches sont générales par nature : elles
 * décrivent le droit de la consommation, qui ne varie pas d'un commerçant à
 * l'autre, et restent donc justes sur toutes les fiches.
 *
 * Trois écarts assumés par rapport à la maquette, où celle-ci décrit des
 * fonctions que la plateforme n'a pas : la réponse publique de l'entreprise et
 * la revendication de fiche n'existent pas encore. Promettre à un lecteur une
 * possibilité qu'il ne trouvera pas serait un défaut, pas une licence
 * rédactionnelle.
 */

/** Neuf motifs du handoff, restreints à ceux que le formulaire propose. */
export const MOTIFS = [
  { cle: "REMBOURSEMENT", libelle: "Remboursement", slug: "remboursement" },
  { cle: "LIVRAISON", libelle: "Livraison ou commande non reçue", slug: "livraison" },
  { cle: "SAV", libelle: "SAV et service après-vente", slug: "sav" },
  { cle: "GARANTIE", libelle: "Garantie et défaut du produit", slug: "garantie" },
  { cle: "RESILIATION", libelle: "Résiliation et prélèvements", slug: "resiliation" },
  { cle: "AUTRE", libelle: "Autre problème", slug: "autre" },
] as const;

export type Demarche = { id: string; titre: string; paragraphes: string[]; puces?: string[] };

/** Les sept démarches éditoriales, dans l'ordre du handoff. */
export function demarches(nom: string, secteur?: string | null): Demarche[] {
  // La place de marché ne concerne que la vente en ligne et la distribution :
  // évoquer un « vendeur tiers » sur la fiche d'un garage de village est hors
  // sujet, et un contenu hors sujet répété sur des millions de pages est
  // exactement ce qui fait juger une page inutile.
  const marketplace = secteur === "vente-distance" || secteur === "commerce-detail";
  return [
    {
      id: "reclamation",
      titre: `Comment contacter ${nom} pour une réclamation ?`,
      paragraphes: [
        "La réclamation commence par un écrit adressé au service client, depuis l’espace personnel ou par courriel, en rappelant le numéro de commande et la date des faits. Conservez une copie de chaque échange : c’est cette trace écrite qui conditionne la suite des démarches, notamment la saisine du médiateur.",
        "Si le service client ne répond pas dans un délai raisonnable, adressez une réclamation écrite au siège par lettre recommandée avec avis de réception. Ce courrier fait courir les délais utiles et constitue la pièce centrale de votre dossier.",
      ],
      puces: [
        "Numéro de commande, date d’achat et montant concerné",
        "Description factuelle du problème, sans appréciation personnelle",
        "Demande précise : remboursement, remplacement, réparation, résiliation",
        "Délai de réponse souhaité, généralement quinze jours",
      ],
    },
    {
      id: "remboursement",
      titre: `${nom} ne me rembourse pas : que faire ?`,
      paragraphes: [
        "En cas de rétractation dans le cadre d’un achat à distance, le professionnel dispose d’un délai encadré pour rembourser à compter de la récupération du bien ou de la preuve de son expédition. Conservez la preuve de dépôt du colis : c’est elle qui fait partir le délai.",
        "Si le délai est dépassé, une mise en demeure écrite rappelant le fondement légal et le montant réclamé est l’étape suivante. En l’absence de règlement, le médiateur de la consommation peut être saisi gratuitement.",
      ],
    },
    {
      id: "livraison",
      titre: `Commande ${nom} non reçue : que faire ?`,
      paragraphes: [
        "Le vendeur est responsable de la bonne livraison du bien jusqu’à sa remise, y compris lorsqu’il fait appel à un transporteur. Un colis annoncé comme livré mais jamais reçu doit être signalé au vendeur, et non uniquement au transporteur.",
        "Demandez par écrit une nouvelle livraison dans un délai que vous fixez. Passé ce délai, vous pouvez demander la résolution de la vente et le remboursement des sommes versées.",
      ],
    },
    ...(marketplace ? [{
      id: "marketplace",
      titre: `Problème avec un vendeur tiers sur ${nom}`,
      paragraphes: [
        "Sur une marketplace, le vendeur peut être un professionnel tiers : c’est lui qui est votre cocontractant, et non la plateforme. Vérifiez sur votre facture l’identité du vendeur, sa raison sociale et son pays d’établissement, car ces éléments déterminent vos recours.",
        "La plateforme reste tenue à certaines obligations d’information et propose en général une garantie contractuelle propre. Adressez votre réclamation au vendeur, puis à la plateforme si elle reste sans réponse.",
      ],
    }] : []),
    {
      id: "sav",
      titre: `SAV ou garantie ${nom} : quelles démarches ?`,
      paragraphes: [
        "Un produit qui tombe en panne relève d’abord de la garantie légale de conformité, due par le vendeur et non par le fabricant. Elle s’exerce sans frais et n’impose pas de démontrer l’origine du défaut pendant la période de présomption.",
        "Formulez votre demande par écrit en indiquant si vous souhaitez la réparation ou le remplacement. Un refus de prise en charge doit être motivé ; conservez-le, il sera utile en médiation.",
      ],
    },
    {
      id: "mediateur",
      titre: `Quel médiateur saisir pour ${nom} ?`,
      paragraphes: [
        "La médiation de la consommation est gratuite pour le consommateur et suppose une réclamation écrite préalable restée sans réponse satisfaisante. Le médiateur compétent est celui dont le professionnel a déclaré relever.",
      ],
    },
    {
      id: "signalconso",
      titre: `Peut-on utiliser SignalConso pour ${nom} ?`,
      paragraphes: [
        "SignalConso est le service public de signalement des anomalies constatées chez un professionnel. Il est pertinent pour une pratique commerciale trompeuse, un produit dangereux ou une information précontractuelle manquante, et il est distinct d’un signalement publié sur Recours France : le premier alerte l’administration, le second documente publiquement le problème rencontré.",
        "Les deux démarches peuvent être menées en parallèle. SignalConso ne se substitue ni à la réclamation auprès du vendeur, ni à la médiation.",
      ],
    },
  ];
}

export const ORDRE_DEMARCHES = [
  { n: "1", titre: "Contacter l’entreprise", desc: "Service client, par écrit, avec le numéro de commande." },
  { n: "2", titre: "Formaliser une réclamation", desc: "Lettre recommandée au siège, demande et délai précisés." },
  { n: "3", titre: "Saisir le médiateur", desc: "Gratuit, après une réclamation écrite restée sans réponse satisfaisante." },
  { n: "4", titre: "Signaler sur SignalConso", desc: "Pour une pratique commerciale trompeuse ou un produit dangereux." },
  { n: "5", titre: "Autres recours", desc: "Selon la situation et le montant en jeu." },
] as const;

/**
 * Le troisième temps diffère de la maquette, qui annonce une réponse publique
 * de l'entreprise : la plateforme ne la permet pas encore, et le périmètre
 * affiché aux utilisateurs l'exclut explicitement.
 */
export const FONCTIONNEMENT = [
  { n: "1", titre: "Le consommateur décrit son problème", desc: "Catégorie, montant, dates et description factuelle des faits." },
  { n: "2", titre: "Le signalement est publié selon les règles de modération", desc: "Les propos injurieux, les accusations pénales et les données personnelles de tiers sont retirés." },
  { n: "3", titre: "L’entreprise peut contester une déclaration", desc: "La contestation est examinée sur pièces ; Recours France ne transmet pas les réclamations aux professionnels." },
  { n: "4", titre: "Le consommateur peut mettre à jour sa situation", desc: "Il indique lui-même si le problème a été résolu ; Recours France ne le constate pas à sa place." },
] as const;

/**
 * Les guides de démarche.
 *
 * Ils ne dépendent d'aucune donnée : ce sont les seules pages du site capables
 * de capter du trafic avant que les fiches d'entreprise n'existent. Ils
 * pointaient jusqu'ici sur trois pages génériques, et la constante n'était
 * utilisée nulle part — un maillage écrit puis oublié.
 */
export const GUIDES = [
  { libelle: "Un commerçant refuse de me rembourser : que faire ?", href: "/aide/remboursement-refuse" },
  { libelle: "Commande non reçue : quels recours ?", href: "/aide/commande-non-recue" },
  { libelle: "Produit en panne, garantie refusée : vos droits", href: "/aide/garantie-refusee" },
  { libelle: "Résiliation ignorée, prélèvement contesté", href: "/aide/resiliation-prelevement" },
  { libelle: "Comment faire une réclamation écrite qui aboutit", href: "/aide/reclamation-ecrite" },
  { libelle: "Comment saisir un médiateur de la consommation", href: "/aide/mediateur" },
  { libelle: "Quels justificatifs conserver en cas de litige ?", href: "/aide/justificatifs" },
] as const;

/**
 * Huit questions fréquentes, réponses toujours visibles — jamais un accordéon,
 * dont le contenu replié pèse moins pour un moteur.
 */
export function faq(nom: string, mediateur: string | null): { q: string; a: string }[] {
  return [
    {
      q: `${nom} ne me rembourse pas, que faire ?`,
      a: "Adressez une réclamation écrite au service client en rappelant le numéro de commande, la date du retour et le montant. Conservez la preuve de dépôt du colis : elle fait courir le délai de remboursement. Sans règlement, une mise en demeure puis la saisine gratuite du médiateur de la consommation sont les étapes suivantes.",
    },
    {
      q: `Comment faire une réclamation auprès de ${nom} ?`,
      a: "Par le service client de l’entreprise, puis par lettre recommandée au siège si la première demande reste sans réponse. Indiquez les faits, votre demande précise et un délai de réponse, généralement quinze jours.",
    },
    {
      q: `Que faire si ma commande ${nom} n’est pas arrivée ?`,
      a: "Le vendeur est responsable de la livraison jusqu’à la remise du bien, y compris lorsqu’un transporteur intervient. Signalez le problème au vendeur par écrit, fixez un délai pour une nouvelle livraison, puis demandez la résolution de la vente et le remboursement si le délai n’est pas tenu.",
    },
    {
      q: `Comment contacter le SAV ${nom} ?`,
      a: "La demande de prise en charge se fait par le service client, en précisant si vous souhaitez la réparation ou le remplacement. La garantie légale de conformité est due par le vendeur, sans frais, et un refus doit être motivé par écrit.",
    },
    {
      q: `Quel médiateur contacter pour ${nom} ?`,
      a: mediateur
        ? `${mediateur}, dont l’adhésion est déclarée par l’entreprise. La saisine est gratuite et suppose une réclamation écrite préalable restée sans réponse satisfaisante.`
        : "Aucune adhésion à un médiateur de la consommation n’est déclarée par cette entreprise à ce jour. Tout professionnel est pourtant tenu de proposer un dispositif de médiation ; à défaut d’information, demandez-lui par écrit de quel médiateur il relève.",
    },
    {
      q: `Peut-on signaler ${nom} sur SignalConso ?`,
      a: "Oui. SignalConso est le service public de signalement des anomalies constatées chez un professionnel : pratique commerciale trompeuse, produit dangereux, information manquante. La démarche est indépendante d’un signalement publié sur Recours France et peut être menée en parallèle.",
    },
    {
      q: `Comment publier un signalement concernant ${nom} ?`,
      a: "Le formulaire prend trois à cinq minutes : catégorie du problème, montant, dates et justificatifs facultatifs. La publication est gratuite et intervient après modération. Vous pourrez ensuite indiquer si votre problème a été résolu.",
    },
    {
      q: `${nom} peut-il répondre à mon signalement ?`,
      a: "Pas encore : Recours France ne recueille aujourd’hui aucune réponse des professionnels et ne leur transmet pas les réclamations. Une entreprise peut en revanche contester une déclaration la concernant, et la contestation est examinée sur pièces.",
    },
  ];
}

/** Avertissements de portée, à ne jamais séparer des chiffres qu'ils qualifient. */
export const PORTEE_STATISTIQUES =
  "Données basées uniquement sur les signalements publiés sur Recours France. Elles ne permettent pas d’évaluer l’ensemble des clients de l’entreprise.";
export const PORTEE_EVOLUTION =
  "Basé uniquement sur les signalements publiés sur Recours France. Une hausse peut refléter une plus forte notoriété de la plateforme autant qu’une évolution réelle de la qualité de service.";
export const AVERTISSEMENT_DECLARATION =
  "Un signalement ne signifie pas qu’un manquement de l’entreprise a été juridiquement établi.";

/**
 * Titre d'un signalement, en langage de recherche.
 *
 * C'est le porteur de longue traîne : il doit contenir le nom de l'entreprise,
 * le motif et la situation, parce que c'est ainsi qu'une personne formule sa
 * requête — « remboursement X non reçu », pas « dossier RF-2026-08-00042 ».
 *
 * Il est composé à partir des champs structurés du signalement et jamais du
 * texte libre de son auteur, qui n'est pas publié.
 */
export function titreSignalement(
  nom: string,
  s: {
    categorie: string;
    demande: string | null;
    etatProfessionnel: string | null;
    resolutionConfirmee: boolean;
    dateFaits: Date;
  },
): string {
  const objet: Record<string, string> = {
    REMBOURSEMENT: `Remboursement ${nom}`,
    LIVRAISON: `Commande ${nom}`,
    SAV: `SAV ${nom}`,
    GARANTIE: `Garantie ${nom}`,
    RESILIATION: `Résiliation ${nom}`,
    AUTRE: `Problème avec ${nom}`,
  };
  const suite: Record<string, string> = {
    REMBOURSEMENT: "non reçu",
    LIVRAISON: "non reçue",
    SAV: "sans prise en charge",
    GARANTIE: "refusée",
    RESILIATION: "non prise en compte",
    AUTRE: "signalé par un consommateur",
  };
  const issue: Record<string, string> = {
    AUCUNE_REPONSE: "après plusieurs relances sans réponse",
    REPONSE_SANS_SOLUTION: "malgré une réponse du service client",
    PROMESSE_NON_TENUE: "après une promesse non tenue",
    REFUS_MOTIVE: "après un refus motivé",
    SOLUTION_PARTIELLE: "avec une solution partielle",
  };
  const demande: Record<string, string> = {
    REMBOURSEMENT_INTEGRAL: "remboursement intégral demandé",
    REMBOURSEMENT_PARTIEL: "remboursement partiel demandé",
    LIVRAISON: "livraison réclamée",
    REPARATION: "réparation demandée",
    REMPLACEMENT: "remplacement demandé",
    RESILIATION: "résiliation demandée",
  };
  const tete = `${objet[s.categorie] ?? objet.AUTRE} ${suite[s.categorie] ?? suite.AUTRE}`;
  if (s.resolutionConfirmee) return `${tete}, puis résolu selon le consommateur`;
  // L'état du professionnel d'abord, la demande à défaut : sans ce repli,
  // plusieurs signalements d'une même catégorie portaient le même titre, et un
  // H3 dupliqué ne capte aucune requête supplémentaire.
  const fin = (s.etatProfessionnel ? issue[s.etatProfessionnel] : null)
    ?? (s.demande ? demande[s.demande] : null)
    // Dernier recours : le mois des faits. Deux signalements de même catégorie
    // dont aucun champ structuré n'est renseigné porteraient sinon le même
    // titre, et des H3 identiques sur une page ne captent rien de plus.
    // Le mois seul, sans tournure : « commande de août » heurte l'élision, et
    // « Commande … — commande de juillet » répète le mot du titre.
    ?? s.dateFaits.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  return `${tete} — ${fin}`;
}

/**
 * Phrase publique du signalement, bâtie sur les seuls champs structurés.
 *
 * Le texte libre du consommateur n'est jamais publié : il n'est pas modéré, et
 * le faire relire un à un supposerait une main-d'œuvre que la plateforme n'a
 * pas. Ces éléments-là sont des choix fermés, donc publiables tels quels.
 */
export function declarationPublique(
  s: {
    categorie: string;
    demande: string | null;
    etatProfessionnel: string | null;
    relances: number | null;
    montant: unknown;
    dateFaits: Date;
  },
  libelleDemande: (c: string) => string,
  libelleEtat: (c: string) => string,
): string {
  const morceaux: string[] = [];
  if (s.demande) morceaux.push(`Le consommateur indique demander : ${libelleDemande(s.demande).toLowerCase()}.`);
  if (s.etatProfessionnel) morceaux.push(`Selon son signalement, la situation du côté du professionnel est : ${libelleEtat(s.etatProfessionnel).toLowerCase()}.`);
  if (s.relances) {
    morceaux.push(
      s.relances >= 3
        ? "Il déclare avoir relancé trois fois ou davantage."
        : `Il déclare avoir relancé ${s.relances === 1 ? "une fois" : "deux fois"}.`,
    );
  }
  return morceaux.join(" ") || "Le consommateur a déclaré un problème sans en préciser davantage la nature.";
}
