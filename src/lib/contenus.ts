/**
 * Contenus éditoriaux opposables : méthodologie, statuts, limites de service.
 * Source unique, réutilisée par la fiche entreprise, la page méthodologie et
 * les emails, pour qu'aucune formulation ne diverge d'un écran à l'autre.
 */

export const VERSION_METHODOLOGIE = "1.0";
export const DATE_METHODOLOGIE = "17 août 2026";

export const METHODOLOGIE: { q: string; a: string }[] = [
  {
    q: "Données issues des sources publiques",
    a: "Identité légale, activité, dirigeants, établissements, dépôts de comptes et événements juridiques proviennent de Sirene (Insee), du RNE (INPI) et du BODACC. Elles sont reprises telles que publiées, avec la date de synchronisation.",
  },
  {
    q: "Données issues des utilisateurs",
    a: "Les signalements, montants, motifs et avis sont déclarés par les consommateurs. Ils portent toujours la mention de leur niveau de vérification.",
  },
  {
    q: "Ce qu’est un signalement accompagné d’un justificatif, et quand la pièce est examinée",
    a: "Une pièce peut être déposée : facture, commande, contrat, preuve de paiement ou échange avec le professionnel. Elle est horodatée et scellée, et un contrôle automatique compare le nom de l’entreprise, la date et le montant avec le signalement. Elle n’est examinée par une personne que si l’entreprise conteste le signalement — et cet examen porte alors sur la réalité du signalement, jamais sur le bien-fondé de la réclamation.",
  },
  {
    q: "Comment une résolution est confirmée",
    a: "Le consommateur confirme lui-même la résolution après clôture. Sans confirmation, le signalement reste en cours, non résolu ou abandonné : il n’est jamais compté comme résolu.",
  },
  {
    q: "Comment les statistiques sont calculées",
    a: "Les taux de réponse, de résolution et les délais sont calculés sur les seuls signalements avec justificatif, en base glissante de douze mois, à partir de ce que déclarent les consommateurs. Les délais sont des médianes, jamais des moyennes.",
  },
  {
    q: "À partir de quel volume un score est publié",
    a: "Le score d’expérience des consommateurs n’est publié qu’à partir de 30 signalements avec justificatif sur douze mois. En dessous, seul l’indice de transparence, fondé sur les données publiques, est affiché.",
  },
  {
    q: "Ce que Recours France ne fait pas encore",
    a: "La plateforme ne transmet pas les réclamations aux professionnels, ne recueille pas leurs réponses et ne suit pas la procédure à la place du consommateur. Les réponses, statuts et délais affichés sont déclarés par les consommateurs.",
  },
  {
    q: "Nature des informations fournies",
    a: "Les démarches proposées sont des informations générales et des parcours prédéfinis, établis à partir des textes applicables. Elles ne constituent pas une consultation juridique personnalisée.",
  },
];

export const STATUTS_EXPLIQUES: { libelle: string; description: string; ton: string }[] = [
  { libelle: "Déclaré", description: "Signalement enregistré, sans contrôle de justificatif.", ton: "var(--rf-texte-desactive)" },
  {
    libelle: "Justificatif déposé",
    description:
      "Pièce déposée par le consommateur, horodatée et scellée. Elle n’est examinée qu’en cas de contestation par l’entreprise.",
    ton: "var(--rf-cobalt)",
  },
  {
    libelle: "Réponse déclarée",
    description: "Le consommateur indique avoir reçu une réponse du professionnel.",
    ton: "var(--rf-cobalt)",
  },
  {
    libelle: "Solution proposée",
    description: "Le consommateur déclare une proposition écrite du professionnel.",
    ton: "var(--rf-cobalt)",
  },
  { libelle: "Résolution partielle", description: "Geste commercial ou remboursement incomplet.", ton: "var(--rf-alerte)" },
  {
    libelle: "Résolution complète confirmée",
    description: "Confirmée par le consommateur après clôture du signalement.",
    ton: "var(--rf-succes)",
  },
  { libelle: "Non résolu", description: "Aucune solution après épuisement des délais.", ton: "var(--rf-erreur)" },
  { libelle: "Abandonné", description: "Signalement laissé sans suite par le consommateur.", ton: "var(--rf-texte-desactive)" },
  { libelle: "En cours", description: "Délai de réponse ou d’instruction non expiré.", ton: "var(--rf-alerte)" },
];

export const CE_QUE_LA_PLATEFORME_NE_FAIT_PAS: string[] = [
  "Recours France ne transmet pas votre réclamation au professionnel et n’envoie aucun courrier à votre place.",
  "La plateforme ne recueille pas la réponse du professionnel : les réponses affichées sont déclarées par les consommateurs.",
  "Les professionnels ne peuvent pas encore répondre aux signalements dans la plateforme.",
  "Recours France ne négocie pas votre litige et ne vous représente pas.",
  "La plateforme ne délivre pas de conseil juridique personnalisé et ne garantit aucun résultat.",
  "Aucune position dans l’annuaire, aucune note et aucun retrait de signalement ne peuvent être achetés.",
  "La plateforme ne se substitue ni au médiateur de la consommation, ni aux autorités publiques, ni au juge.",
];

export const APRES_SIGNALEMENT: string[] = [
  "Les démarches à effectuer, dans le bon ordre",
  "Les justificatifs et preuves à conserver",
  "Les coordonnées utiles du professionnel",
  "Les coordonnées du service réclamation lorsqu’elles sont identifiées",
  "Le médiateur compétent lorsqu’il est identifié",
  "Les recours officiels disponibles, et SignalConso lorsque cette démarche est pertinente",
];

export const POIDS_TRANSPARENCE = [
  { label: "Identité légale vérifiée", weight: "20 pts" },
  { label: "Société active", weight: "15 pts" },
  { label: "Ancienneté", weight: "10 pts" },
  { label: "Régularité des dépôts de comptes", weight: "25 pts" },
  { label: "Cohérence Sirene / RNE / BODACC", weight: "15 pts" },
  { label: "Absence de procédure collective", weight: "15 pts" },
];

export const POIDS_EXPERIENCE = [
  { label: "Taux de réponse déclaré", weight: "30 pts" },
  { label: "Résolutions complètes confirmées", weight: "25 pts" },
  { label: "Délai médian de résolution", weight: "20 pts" },
  { label: "Part de signalements non résolus", weight: "15 pts" },
  { label: "Évolution sur 90 jours", weight: "10 pts" },
];

export const REGLES_STATISTIQUES = [
  {
    metric: "Signalements déclarés",
    rule: "Nombre de signalements enregistrés sur les douze derniers mois, tous niveaux de vérification confondus. Un signalement par consommateur et par litige ; les doublons sont fusionnés.",
  },
  {
    metric: "Signalements vérifiés",
    rule: "Sous-ensemble des signalements déclarés accompagnés d’une pièce déposée, horodatée et scellée. C’est la base de tous les indicateurs de comportement.",
  },
  {
    metric: "Taux de réponse déclaré",
    rule: "Part des signalements avec justificatif pour lesquels le consommateur déclare avoir reçu une réponse du professionnel. Recours France ne reçoit pas ces réponses.",
  },
  {
    metric: "Taux de résolution",
    rule: "Part des signalements avec justificatif clôturés dont la résolution a été confirmée par le consommateur. Un signalement abandonné ou sans retour n’est jamais compté comme résolu.",
  },
  {
    metric: "Délai médian de résolution",
    rule: "Médiane des délais entre le signalement et la confirmation de résolution, sur les signalements avec justificatif résolus des douze derniers mois.",
  },
];

export const DROITS_ET_RECTIFICATION = [
  {
    title: "Rectification sous 15 jours",
    desc: "Une donnée inexacte est corrigée sous 15 jours après examen des pièces fournies, avec information du consommateur concerné.",
  },
  {
    title: "Contestation d’un signalement",
    desc: "Une entreprise peut contester la réalité d’un signalement en produisant des éléments contraires. Le signalement est réexaminé et, le cas échéant, déclassé ou retiré.",
  },
  {
    title: "Aucun retrait sur simple demande",
    desc: "Un signalement avec justificatif n’est pas retiré à la demande de l’entreprise ni contre paiement. Seule une erreur établie justifie un retrait.",
  },
  {
    title: "Droit de réponse publique",
    desc: "Le droit de réponse publique des professionnels n’est pas encore ouvert dans cette version de la plateforme. Une entreprise peut revendiquer sa fiche et signaler une erreur ; sa réponse aux signalements n’est pas publiée à ce stade.",
  },
];

export const SOURCES_PUBLIQUES = [
  {
    name: "Répertoire Sirene",
    desc: "Identité légale, activité principale, établissements, effectif déclaré et état administratif.",
    tag: "Insee",
    freq: "Synchronisé chaque jour",
  },
  {
    name: "Registre national des entreprises",
    desc: "Forme juridique, dirigeants, capital, modifications statutaires et pièces déposées.",
    tag: "INPI / RNE",
    freq: "Synchronisé chaque jour",
  },
  {
    name: "BODACC",
    desc: "Dépôts de comptes annuels, procédures collectives, ventes et cessions, autres annonces légales.",
    tag: "BODACC",
    freq: "Synchronisé chaque jour",
  },
  {
    name: "Liste des médiateurs de la consommation",
    desc: "Médiateur compétent, rapproché de la liste publique des médiateurs référencés par la CECMC.",
    tag: "Donnée publique",
    freq: "Vérifié chaque mois",
  },
  {
    name: "Site officiel de l’entreprise",
    desc: "URL, téléphone et email du service consommateurs, conditions générales, page contact et mention de médiation.",
    tag: "Site de l’entreprise",
    freq: "Vérifié à chaque synchronisation",
  },
];

export const PIECES_UTILES = [
  "Facture, bon de commande ou confirmation de paiement",
  "Échanges écrits avec le service client",
  "Photographies du produit ou du défaut",
  "Preuve d’envoi d’un retour ou d’une réclamation",
];
