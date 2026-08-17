/**
 * Catégories juridiques de niveau III (Insee). Extrait des formes les plus
 * fréquentes ; les codes absents retombent sur le libellé de niveau I.
 */
export const NATURES_JURIDIQUES: Record<string, string> = {
  "1000": "Entrepreneur individuel",
  "2110": "Indivision entre personnes physiques",
  "2310": "Société créée de fait entre personnes physiques",
  "2385": "Société en participation",
  "3120": "Société commerciale étrangère immatriculée au RCS",
  "5202": "Société en nom collectif",
  "5306": "Société en commandite simple",
  "5385": "Société en commandite par actions",
  "5498": "Société à responsabilité limitée (SARL)",
  "5499": "Société à responsabilité limitée (SARL)",
  "5410": "SARL d’économie mixte",
  "5415": "SARL coopérative de production (SCOP)",
  "5426": "SARL immobilière",
  "5442": "Entreprise unipersonnelle à responsabilité limitée (EURL)",
  "5443": "SARL unipersonnelle",
  "5451": "SARL coopérative de consommation",
  "5453": "SARL coopérative artisanale",
  "5458": "SARL coopérative de commerçants détaillants",
  "5460": "SARL coopérative",
  "5470": "Autre SARL",
  "5485": "SARL d’aménagement foncier",
  "5505": "Société anonyme à conseil d’administration",
  "5510": "Société anonyme à conseil d’administration",
  "5515": "Société anonyme coopérative de production (SCOP)",
  "5520": "Société anonyme d’économie mixte",
  "5522": "Société anonyme coopérative",
  "5546": "Société anonyme de crédit immobilier",
  "5547": "Société anonyme coopérative de consommation",
  "5548": "Société anonyme coopérative de commerçants détaillants",
  "5551": "Société anonyme coopérative agricole",
  "5560": "Société anonyme à conseil d’administration",
  "5585": "Société d’exercice libéral à forme anonyme",
  "5599": "Société anonyme à directoire",
  "5605": "Société anonyme à directoire",
  "5699": "Société anonyme à directoire",
  "5710": "Société par actions simplifiée (SAS)",
  "5720": "Société par actions simplifiée unipersonnelle (SASU)",
  "5785": "Société d’exercice libéral par actions simplifiée",
  "5800": "Société européenne",
  "6100": "Caisse d’épargne et de prévoyance",
  "6220": "Groupement d’intérêt économique (GIE)",
  "6316": "Coopérative d’utilisation de matériel agricole",
  "6317": "Société coopérative agricole",
  "6318": "Union de sociétés coopératives agricoles",
  "6411": "Société d’assurance mutuelle",
  "6532": "Société civile immobilière",
  "6533": "Société civile immobilière de construction-vente",
  "6540": "Société civile",
  "6541": "Société civile de moyens",
  "6542": "Société civile professionnelle",
  "6558": "Société civile coopérative",
  "6588": "Société civile",
  "6901": "Autre personne de droit privé",
  "7112": "Autorité administrative indépendante",
  "7220": "Commune",
  "7361": "Établissement public local d’enseignement",
  "8110": "Régime général de la sécurité sociale",
  "9220": "Association déclarée",
  "9221": "Association déclarée d’insertion par l’économique",
  "9230": "Association déclarée reconnue d’utilité publique",
  "9260": "Association de droit local",
  "9300": "Fondation",
  "9970": "Groupement de coopération sanitaire",
};

/** Libellé de repli à partir du premier chiffre du code (niveau I). */
export function familleJuridique(code: string | null | undefined): string | null {
  if (!code) return null;
  switch (code.charAt(0)) {
    case "1":
      return "Entrepreneur individuel";
    case "2":
      return "Groupement de droit privé non doté de la personnalité morale";
    case "3":
      return "Personne morale de droit étranger";
    case "4":
      return "Personne morale de droit public soumise au droit commercial";
    case "5":
      return "Société commerciale";
    case "6":
      return "Autre personne morale de droit privé inscrite au registre du commerce";
    case "7":
      return "Personne morale de droit public administratif";
    case "8":
      return "Organisme privé spécialisé";
    case "9":
      return "Groupement de droit privé";
    default:
      return null;
  }
}
